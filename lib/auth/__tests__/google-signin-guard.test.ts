import { describe, it, expect, vi } from "vitest";
import { validateGoogleSignIn } from "../google-signin-guard";
import type { DatabaseUser } from "../users";

const activeUser: DatabaseUser = {
  id: "uuid-1",
  name: "Ana",
  email: "ana@gmail.com",
  role: "PACIENTE",
  active: true,
  professionalId: null,
  patientId: null,
};

const inactiveUser: DatabaseUser = { ...activeUser, active: false };

describe("validateGoogleSignIn", () => {
  it("returns false when profile has no email", async () => {
    expect(
      await validateGoogleSignIn({ email_verified: true }, vi.fn(), false),
    ).toBe(false);
  });

  it("returns false when email_verified is false", async () => {
    expect(
      await validateGoogleSignIn({ email: "a@g.com", email_verified: false }, vi.fn(), false),
    ).toBe(false);
  });

  it("returns false when user not found and autoCreate disabled", async () => {
    const findUser = vi.fn().mockResolvedValue(null);
    expect(
      await validateGoogleSignIn({ email: "new@g.com", email_verified: true }, findUser, false),
    ).toBe(false);
  });

  it("returns true when user not found and autoCreate enabled", async () => {
    const findUser = vi.fn().mockResolvedValue(null);
    expect(
      await validateGoogleSignIn({ email: "new@g.com", email_verified: true }, findUser, true),
    ).toBe(true);
  });

  it("returns false when user exists but is inactive", async () => {
    const findUser = vi.fn().mockResolvedValue(inactiveUser);
    expect(
      await validateGoogleSignIn({ email: "ana@gmail.com", email_verified: true }, findUser, false),
    ).toBe(false);
  });

  it("returns true when user exists and is active", async () => {
    const findUser = vi.fn().mockResolvedValue(activeUser);
    expect(
      await validateGoogleSignIn({ email: "ana@gmail.com", email_verified: true }, findUser, false),
    ).toBe(true);
  });

  it("normalizes email to lowercase before calling findUser", async () => {
    const findUser = vi.fn().mockResolvedValue(activeUser);
    await validateGoogleSignIn({ email: "Ana@Gmail.Com", email_verified: true }, findUser, false);
    expect(findUser).toHaveBeenCalledWith("ana@gmail.com");
  });
});
