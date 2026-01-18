export function getRequestId(request: Request): string {
  const headerId = request.headers.get("x-request-id");
  if (headerId) {
    return headerId;
  }
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(16).slice(2);
}
