import { describe, expect, it } from "vitest";

import { safeEqual } from "@/lib/security/safe-compare";

describe("safeEqual", () => {
  it("returns true for identical secrets", () => {
    expect(safeEqual("secret-123", "secret-123")).toBe(true);
  });

  it("returns false for different secrets of the same length", () => {
    expect(safeEqual("secret-123", "secret-124")).toBe(false);
  });

  it("returns false without throwing on length mismatch", () => {
    expect(() => safeEqual("short", "a-much-longer-secret")).not.toThrow();
    expect(safeEqual("short", "a-much-longer-secret")).toBe(false);
  });

  it("returns false when either side is missing or empty", () => {
    expect(safeEqual("", "")).toBe(false);
    expect(safeEqual(undefined, undefined)).toBe(false);
    expect(safeEqual(null, null)).toBe(false);
    expect(safeEqual("secret", "")).toBe(false);
    expect(safeEqual(undefined, "secret")).toBe(false);
    expect(safeEqual("secret", null)).toBe(false);
  });

  it("is case and whitespace sensitive", () => {
    expect(safeEqual("Secret", "secret")).toBe(false);
    expect(safeEqual("secret ", "secret")).toBe(false);
  });
});
