import { afterEach, describe, expect, it, vi } from "vitest";

import { buildBucketStarts, normalizeBucketStart, parseRange } from "@/lib/analytics/range";

const asIso = (date: Date) => date.toISOString();

describe("parseRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses the last 7 days range and uses daily buckets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-04-15T12:00:00Z"));

    const range = parseRange({ range: "last7" }, { timeZone: "UTC" });

    expect(range.bucket).toBe("day");
    expect(asIso(range.from)).toBe("2024-04-09T00:00:00.000Z");
    expect(asIso(range.to)).toBe("2024-04-16T00:00:00.000Z");
  });

  it("normalizes custom ranges when from is after to", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-04-15T12:00:00Z"));

    const range = parseRange({ range: "custom", from: "2024-05-10", to: "2024-05-01" }, { timeZone: "UTC" });

    expect(asIso(range.from)).toBe("2024-05-01T00:00:00.000Z");
    expect(asIso(range.to)).toBe("2024-05-11T00:00:00.000Z");
  });

  it("handles DST boundaries for today in America/New_York", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-10T12:00:00Z"));

    const range = parseRange({ range: "today" }, { timeZone: "America/New_York" });

    expect(asIso(range.from)).toBe("2024-03-10T05:00:00.000Z");
    expect(asIso(range.to)).toBe("2024-03-11T04:00:00.000Z");
  });
});

describe("buildBucketStarts", () => {
  it("builds weekly buckets aligned to monday", () => {
    const from = new Date("2024-05-15T00:00:00Z");
    const to = new Date("2024-06-02T00:00:00Z");

    const buckets = buildBucketStarts(from, to, "week", "UTC");

    expect(buckets.length).toBeGreaterThan(0);
    expect(asIso(buckets[0])).toBe("2024-05-13T00:00:00.000Z");
  });

  it("builds monthly buckets without gaps", () => {
    const from = new Date("2024-01-10T00:00:00Z");
    const to = new Date("2024-04-01T00:00:00Z");

    const buckets = buildBucketStarts(from, to, "month", "UTC");

    expect(buckets.map(asIso)).toEqual([
      "2024-01-01T00:00:00.000Z",
      "2024-02-01T00:00:00.000Z",
      "2024-03-01T00:00:00.000Z",
    ]);
  });
});

describe("normalizeBucketStart", () => {
  it("normalizes monthly buckets to the first day", () => {
    const input = new Date("2024-03-18T00:00:00Z");
    const normalized = normalizeBucketStart(input, "month", "UTC");

    expect(asIso(normalized)).toBe("2024-03-01T00:00:00.000Z");
  });
});
