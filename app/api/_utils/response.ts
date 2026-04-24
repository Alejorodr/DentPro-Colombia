import { NextResponse } from "next/server";

const DEFAULT_INTERNAL_ERROR_MESSAGE = "Ocurrió un error interno. Intenta de nuevo.";

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function internalServerErrorResponse(message = DEFAULT_INTERNAL_ERROR_MESSAGE) {
  return errorResponse(message, 500);
}

export function serviceUnavailableResponse(message: string, retryAfterMs?: number) {
  const headers = new Headers();
  if (retryAfterMs && retryAfterMs > 0) {
    headers.set("Retry-After", Math.ceil(retryAfterMs / 1000).toString());
  }
  return NextResponse.json({ error: message }, { status: 503, headers });
}
