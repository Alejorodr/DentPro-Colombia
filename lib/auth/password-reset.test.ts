import { describe, expect, it } from "vitest";

import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenExpired,
  validatePasswordPolicy,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "./password-reset";

describe("password reset helpers", () => {
  it("generates a token hash and expiry within 60 minutes", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const { token, tokenHash, expiresAt } = generatePasswordResetToken(now);

    expect(token).toHaveLength(64);
    expect(tokenHash).toBe(hashPasswordResetToken(token));
    expect(expiresAt.getTime()).toBe(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
  });

  it("detects expired tokens correctly", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);

    expect(isPasswordResetTokenExpired(expiresAt, now)).toBe(false);
    expect(isPasswordResetTokenExpired(expiresAt, new Date(expiresAt.getTime() + 1))).toBe(true);
  });

  it("validates password policy", () => {
    expect(validatePasswordPolicy("short").valid).toBe(false);
    expect(validatePasswordPolicy("longbutnocaps1").valid).toBe(false);
    expect(validatePasswordPolicy("ValidPass123").valid).toBe(true);
  });
});
