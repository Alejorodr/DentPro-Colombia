type MemoryEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, MemoryEntry>();

export function checkMemoryRateLimit(params: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const entry = memoryStore.get(params.key);
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(params.key, { count: 1, resetAt: now + params.windowMs });
    return { allowed: true as const };
  }

  entry.count += 1;
  if (entry.count > params.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false as const, retryAfter };
  }

  memoryStore.set(params.key, entry);
  return { allowed: true as const };
}
