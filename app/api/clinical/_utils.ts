export function getRequestId(request: Request) {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-vercel-id") ??
    request.headers.get("x-amzn-trace-id") ??
    crypto.randomUUID()
  );
}

export function getRouteFromRequest(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}
