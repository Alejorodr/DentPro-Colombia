import { describe, expect, it } from "vitest";

import { checkMemoryRateLimit } from "@/lib/rateLimit";

describe("memory rate limit", () => {
  it("blocks after exceeding limit", () => {
    const key = `test-key-${Math.random().toString(16).slice(2)}`;
    const first = checkMemoryRateLimit({ key, limit: 2, windowMs: 60_000 });
    const second = checkMemoryRateLimit({ key, limit: 2, windowMs: 60_000 });
    const third = checkMemoryRateLimit({ key, limit: 2, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfter).toBeGreaterThan(0);
  });
});
