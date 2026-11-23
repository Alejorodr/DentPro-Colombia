export function getRequestId(request: Request): string {
  const headerId = request.headers.get("x-request-id");
  if (headerId) {
    return headerId;
  }
  // Web Crypto está disponible en Node 24 y en el runtime de Next; sin fallback a Math.random.
  return crypto.randomUUID();
}
