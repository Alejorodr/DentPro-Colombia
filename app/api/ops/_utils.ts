import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function isOpsEnabled(): boolean {
  return process.env.OPS_ENABLED === "true";
}

export function getOpsKey(): string | null {
  const value = process.env.OPS_KEY?.trim();
  return value && value.length > 0 ? value : null;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function enforceRateLimit(request: Request): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${ip}:ops`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Demasiadas solicitudes." },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfterSeconds.toString(),
        },
      },
    );
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return null;
}

export function respondNotFound(): NextResponse {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export function respondUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Operación no autorizada." }, { status: 403 });
}

export function respondGenericError(): NextResponse {
  return NextResponse.json({ error: "No se pudo completar la operación." }, { status: 500 });
}
