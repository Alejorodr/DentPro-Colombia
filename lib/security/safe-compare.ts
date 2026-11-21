import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Constant-time comparison for secrets (tokens, API keys, cron secrets).
 * Both values are hashed to fixed-length SHA-256 digests first, so the
 * comparison never throws on length mismatch and does not leak length via timing.
 * Returns false when either side is missing or empty.
 */
export function safeEqual(a?: string | null, b?: string | null): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || b.length === 0) {
    return false;
  }
  return timingSafeEqual(digest(a), digest(b));
}
