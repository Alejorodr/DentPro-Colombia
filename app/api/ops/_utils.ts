import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/app/api/_utils/ratelimit";

const OPS_RATE_LIMIT_CONFIG = {
  limit: 5,
  window: "1 m",
  windowMs: 60_000,
} as const;

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

  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

export function getOpsIpAllowlist(): string[] {
  const raw = process.env.OPS_IP_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isOpsIpAllowed(request: Request): boolean {
  const allowlist = getOpsIpAllowlist();
  if (allowlist.length === 0) {
    return true;
  }
  const clientIp = getClientIp(request);
  return allowlist.includes(clientIp);
}

export async function enforceOpsRateLimit(request: Request): Promise<NextResponse | null> {
  return enforceRateLimit(request, "ops", OPS_RATE_LIMIT_CONFIG);
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
