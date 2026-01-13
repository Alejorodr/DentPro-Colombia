import { describe, expect, it, vi, afterEach } from "vitest";

import { buildBucketStarts, parseRange } from "@/app/portal/admin/_data/analytics-range";

const asIso = (date: Date) => date.toISOString();

describe("parseRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses the last 7 days range and uses daily buckets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-04-15T12:00:00Z"));

    const range = parseRange({ range: "7d" });

    expect(range.bucket).toBe("day");
    expect(asIso(range.from)).toBe("2024-04-09T00:00:00.000Z");
    expect(asIso(range.to)).toBe("2024-04-16T00:00:00.000Z");
  });

  it("normalizes custom ranges when from is after to", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-04-15T12:00:00Z"));

    const range = parseRange({ range: "custom", from: "2024-05-10", to: "2024-05-01" });

    expect(asIso(range.from)).toBe("2024-05-01T00:00:00.000Z");
    expect(asIso(range.to)).toBe("2024-05-11T00:00:00.000Z");
  });
});

describe("buildBucketStarts", () => {
  it("builds weekly buckets aligned to monday", () => {
    const from = new Date("2024-05-15T00:00:00Z");
    const to = new Date("2024-06-02T00:00:00Z");

    const buckets = buildBucketStarts(from, to, "week");

    expect(buckets.length).toBeGreaterThan(0);
    expect(asIso(buckets[0])).toBe("2024-05-13T00:00:00.000Z");
  });
});
