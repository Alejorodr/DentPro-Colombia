import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { enforceRateLimit } from "@/app/api/_utils/ratelimit";

const OPS_RATE_LIMIT_CONFIG = {
  limit: 5,
  window: "1 m",
  windowMs: 60_000,
} as const;

type OpsRateLimitOptions = {
  allowE2EBypass?: boolean;
};

function canBypassOpsRateLimitForE2E() {
  return (
    process.env.RUN_E2E === "1" &&
    process.env.TEST_AUTH_BYPASS === "1" &&
    process.env.VERCEL !== "1" &&
    !process.env.VERCEL_ENV
  );
}

export function getOpsKey(): string | null {
  const value = process.env.OPS_KEY?.trim();
  return value && value.length > 0 ? value : null;
}

export function isValidOpsKey(headerKey: string | null | undefined, opsKey: string | null): boolean {
  if (!headerKey || !opsKey) {
    return false;
  }

  const expected = Buffer.from(opsKey, "utf8");
  const actual = Buffer.from(headerKey, "utf8");
  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function firstHeaderValue(request: Request, name: string): string | null {
  const raw = request.headers.get(name);
  if (!raw) {
    return null;
  }
  const first = raw.split(",")[0]?.trim();
  return first ? first : null;
}

export function getClientIp(request: Request): string {
  if (process.env.VERCEL === "1") {
    // En Vercel, `x-vercel-forwarded-for` y `x-real-ip` los fija el edge de Vercel
    // y el cliente no puede falsificarlos. `x-forwarded-for` no se consulta aquí.
    return firstHeaderValue(request, "x-vercel-forwarded-for") ?? firstHeaderValue(request, "x-real-ip") ?? "unknown";
  }

  const realIp = firstHeaderValue(request, "x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fuera de Vercel, `x-forwarded-for` (y `x-real-ip`) solo son confiables si la app
  // corre detrás de un reverse proxy que SOBRESCRIBE estos headers con la IP real del
  // cliente. Un self-hosting expuesto directamente permite falsificarlos y saltarse la
  // allowlist. Tomar el último hop tampoco es fiable sin conocer la cadena de proxies.
  const forwardedFor = firstHeaderValue(request, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor;
  }

  return firstHeaderValue(request, "cf-connecting-ip") ?? "unknown";
}

export function getOpsIpAllowlist(): string[] {
  const raw = process.env.OPS_IP_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isProductionOpsRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

/**
 * Una allowlist vacía solo se tolera en E2E local/CI: `next start` corre con
 * NODE_ENV=production, así que se permite cuando RUN_E2E=1 y NO es un runtime de Vercel.
 */
function canUseEmptyAllowlistForE2E(): boolean {
  return process.env.RUN_E2E === "1" && process.env.VERCEL !== "1" && !process.env.VERCEL_ENV;
}

/**
 * Allowlist de IPs para rutas ops.
 * - Producción (NODE_ENV=production o VERCEL_ENV=production): allowlist vacía => DENEGAR
 *   (fail-closed), salvo E2E fuera de Vercel (ver `canUseEmptyAllowlistForE2E`).
 * - Development/test: allowlist vacía => permitir.
 * - Con allowlist definida: solo IPs listadas, en cualquier entorno.
 */
export function isOpsIpAllowed(request: Request): boolean {
  const allowlist = getOpsIpAllowlist();
  if (allowlist.length === 0) {
    if (!isProductionOpsRuntime()) {
      return true;
    }
    return canUseEmptyAllowlistForE2E();
  }
  const clientIp = getClientIp(request);
  return allowlist.includes(clientIp);
}

export async function enforceOpsRateLimit(request: Request, options: OpsRateLimitOptions = {}): Promise<NextResponse | null> {
  if (options.allowE2EBypass && canBypassOpsRateLimitForE2E()) {
    return null;
  }

  return enforceRateLimit(request, "ops", OPS_RATE_LIMIT_CONFIG);
}

export function respondNotFound(): NextResponse {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export function respondDisabled(_reason: string, status = 403): NextResponse {
  return NextResponse.json({ error: "Endpoint disabled by runtime configuration." }, { status });
}

export function respondUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Operación no autorizada." }, { status: 403 });
}

export function respondGenericError(): NextResponse {
  return NextResponse.json({ error: "No se pudo completar la operación." }, { status: 500 });
}
