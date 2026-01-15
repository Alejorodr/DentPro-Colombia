import { NextResponse } from "next/server";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitConfig = {
  limit: number;
  window: Duration;
  windowMs: number;
};

const inMemoryStore = new Map<string, { count: number; resetAt: number }>();
const ratelimiters = new Map<string, Ratelimit>();

const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = hasUpstashConfig ? Redis.fromEnv() : null;

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("cf-connecting-ip")?.trim() || "unknown";
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

export async function enforceRateLimit(request: Request, key: string, config: RateLimitConfig) {
  const ip = getClientIp(request);
  const identifier = `${key}:${ip}`;

  const limiter = getRatelimiter(config);
  if (limiter) {
    const result = await limiter.limit(identifier);
    if (!result.success) {
      const reset = typeof result.reset === "number" ? result.reset : Date.now();
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta más tarde.", retryAfter },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
          },
        },
      );
    }
    return null;
  }

  const now = Date.now();
  const entry = inMemoryStore.get(identifier);
  if (!entry || entry.resetAt <= now) {
    inMemoryStore.set(identifier, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  entry.count += 1;
  if (entry.count > config.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta más tarde.", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
        },
      },
    );
  }

  return null;
}
