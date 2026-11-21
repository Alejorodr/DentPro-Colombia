import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getRuntimeStage, isProductionRuntime } from "@/lib/auth/runtime";
import { logger } from "@/lib/logger";

export type RateLimitConfig = {
  limit: number;
  window: Duration;
  windowMs: number;
};

export type RateLimitOptions = {
  /**
   * When true, production requests are rejected with 503 if the distributed
   * (Upstash) limiter is not configured or errors, instead of falling back to the
   * per-instance memory limiter (which barely limits anything on serverless).
   * Defaults to `isSecuritySensitiveRateLimitKey(key)`.
   */
  failClosed?: boolean;
};

/**
 * Buckets protecting credentials/brute-forceable endpoints. Matched by key prefix
 * so existing callers (`auth:register`, `auth:forgot-password`,
 * `auth:reset-password`, `ops`, ...) fail closed in production without changes.
 * New sensitive buckets should use one of these prefixes or pass `{ failClosed: true }`.
 */
const SECURITY_SENSITIVE_KEY_PREFIXES = ["auth:", "ops:"] as const;
const SECURITY_SENSITIVE_KEYS = new Set(["ops"]);

export function isSecuritySensitiveRateLimitKey(key: string): boolean {
  return SECURITY_SENSITIVE_KEYS.has(key) || SECURITY_SENSITIVE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

const FAIL_CLOSED_RETRY_AFTER_SECONDS = 60;

const ratelimiters = new Map<string, Ratelimit>();
let warnedMissingUpstashConfig = false;
let warnedUpstashFailure = false;
let reportedFailClosed = false;

const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = hasUpstashConfig ? Redis.fromEnv() : null;

function firstHeaderValue(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.split(",")[0]?.trim();
  return value ? value : null;
}

export function getClientIp(request: Request): string {
  // On Vercel the platform overwrites these headers, so they cannot be spoofed by the client.
  if (process.env.VERCEL === "1") {
    const platformIp = firstHeaderValue(request, "x-vercel-forwarded-for") ?? firstHeaderValue(request, "x-real-ip");
    if (platformIp) {
      return platformIp;
    }
  }

  return (
    firstHeaderValue(request, "x-forwarded-for") ??
    firstHeaderValue(request, "x-real-ip") ??
    firstHeaderValue(request, "cf-connecting-ip") ??
    "unknown"
  );
}

function getRatelimiter(config: RateLimitConfig) {
  const key = `${config.limit}:${config.window}`;
  const existing = ratelimiters.get(key);
  if (existing) {
    return existing;
  }

  if (!redis) {
    return null;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(config.limit, config.window),
    analytics: true,
    prefix: "dentpro:ratelimit",
  });

  ratelimiters.set(key, limiter);
  return limiter;
}

function getMemoryRateLimitResponse(identifier: string, config: RateLimitConfig) {
  const memoryResult = checkMemoryRateLimit({
    key: identifier,
    limit: config.limit,
    windowMs: config.windowMs,
  });

  if (!memoryResult.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta más tarde.", retryAfter: memoryResult.retryAfter },
      {
        status: 429,
        headers: { "Retry-After": memoryResult.retryAfter.toString() },
      },
    );
  }

  return null;
}

function failClosedResponse(key: string, reason: "missing_config" | "upstash_error") {
  if (!reportedFailClosed) {
    reportedFailClosed = true;
    logger.error({
      event: "ratelimit.fail_closed",
      bucket: key,
      reason,
      runtimeStage: getRuntimeStage(),
    });
    Sentry.captureMessage(`[ratelimit] Distributed limiter unavailable (${reason}); failing closed for sensitive buckets.`, "error");
  }

  return NextResponse.json(
    { error: "Servicio temporalmente no disponible. Intenta más tarde." },
    {
      status: 503,
      headers: { "Retry-After": FAIL_CLOSED_RETRY_AFTER_SECONDS.toString() },
    },
  );
}

export async function enforceRateLimit(
  request: Request,
  key: string,
  config: RateLimitConfig,
  options: RateLimitOptions = {},
) {
  const ip = getClientIp(request);
  const identifier = `${key}:${ip}`;
  const runtimeStage = getRuntimeStage();
  const isProd = isProductionRuntime();
  // CI/E2E runs a production build without Upstash on purpose; keep it on the memory limiter.
  const shouldFailClosed =
    isProd && runtimeStage !== "ci-e2e" && (options.failClosed ?? isSecuritySensitiveRateLimitKey(key));

  let failureReason: "missing_config" | "upstash_error" = "missing_config";
  const limiter = getRatelimiter(config);
  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      if (!result.success) {
        const reset = typeof result.reset === "number" ? result.reset : Date.now();
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return NextResponse.json(
          { error: "Demasiadas solicitudes. Intenta más tarde.", retryAfter },
          {
            status: 429,
            headers: { "Retry-After": retryAfter.toString() },
          },
        );
      }
      return null;
    } catch (error) {
      failureReason = "upstash_error";
      if (!warnedUpstashFailure) {
        console.warn(
          "[ratelimit] Upstash unavailable; using conservative in-memory fallback for non-sensitive buckets.",
          error instanceof Error ? error.name : "unknown_error",
        );
        warnedUpstashFailure = true;
      }
    }
  }

  if (shouldFailClosed) {
    return failClosedResponse(key, failureReason);
  }

  if (isProd && !limiter && !warnedMissingUpstashConfig) {
    const warning =
      runtimeStage === "vercel-production"
        ? "[ratelimit] Upstash not configured in Vercel production; using conservative in-memory fallback."
        : runtimeStage === "ci-e2e"
          ? "[ratelimit] Upstash not configured in CI/E2E; using in-memory fallback for deterministic tests."
          : `[ratelimit] Upstash not configured in ${runtimeStage}; using conservative in-memory fallback.`;
    console.warn(warning);
    warnedMissingUpstashConfig = true;
  }

  return getMemoryRateLimitResponse(identifier, config);
}

export type IdentifierRateLimitResult = { allowed: true } | { allowed: false; reason: "limited" | "unavailable" };

/**
 * Límite por identificador arbitrario (p. ej. una cuenta), para flujos sin `Request` propio
 * como `authorize` de NextAuth. Mismas reglas que `enforceRateLimit`: las claves sensibles
 * (`auth:*`, `ops`) fallan cerradas en producción si Upstash no está disponible.
 */
export async function checkIdentifierRateLimit(
  key: string,
  identifier: string,
  config: RateLimitConfig,
  options: RateLimitOptions = {},
): Promise<IdentifierRateLimitResult> {
  const fullIdentifier = `${key}:${identifier}`;
  const shouldFailClosed =
    isProductionRuntime() &&
    getRuntimeStage() !== "ci-e2e" &&
    (options.failClosed ?? isSecuritySensitiveRateLimitKey(key));

  const limiter = getRatelimiter(config);
  if (limiter) {
    try {
      const result = await limiter.limit(fullIdentifier);
      return result.success ? { allowed: true } : { allowed: false, reason: "limited" };
    } catch (error) {
      if (shouldFailClosed) {
        failClosedResponse(key, "upstash_error");
        return { allowed: false, reason: "unavailable" };
      }
      logger.warn({ event: "ratelimit.identifier_fallback", bucket: key, error: error instanceof Error ? error.name : "unknown" });
    }
  } else if (shouldFailClosed) {
    failClosedResponse(key, "missing_config");
    return { allowed: false, reason: "unavailable" };
  }

  const memoryResult = checkMemoryRateLimit({ key: fullIdentifier, limit: config.limit, windowMs: config.windowMs });
  return memoryResult.allowed ? { allowed: true } : { allowed: false, reason: "limited" };
}
