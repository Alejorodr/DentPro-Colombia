import { NextResponse } from "next/server";

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function serviceUnavailableResponse(message: string, retryAfterMs?: number) {
  const headers = new Headers();
  if (retryAfterMs && retryAfterMs > 0) {
    headers.set("Retry-After", Math.ceil(retryAfterMs / 1000).toString());
  }
  return NextResponse.json({ error: message }, { status: 503, headers });
}
