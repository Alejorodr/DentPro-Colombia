import { describe, expect, it } from "vitest";

import { resolveSessionUser } from "../session";
import type { DatabaseUser } from "../users";

const activeUser: DatabaseUser = {
  id: "user-1",
  name: "User",
  email: "user@dentpro.test",
  role: "ADMINISTRADOR",
  active: true,
  mustChangePassword: false,
  professionalId: null,
  patientId: null,
  passwordChangedAt: null,
};

function token(overrides: Record<string, unknown> = {}) {
  return {
    sub: activeUser.id,
    userId: activeUser.id,
    role: activeUser.role,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe("resolveSessionUser", () => {
  it("uses the current database role and profile data", () => {
    const result = resolveSessionUser(token(), activeUser);
    expect(result).toMatchObject({ id: activeUser.id, role: "ADMINISTRADOR" });
  });

  it("rejects a token after the account is deactivated", () => {
    expect(resolveSessionUser(token(), { ...activeUser, active: false })).toBeNull();
  });

  it("rejects a token whose role no longer matches the database", () => {
    expect(resolveSessionUser(token(), { ...activeUser, role: "PACIENTE" })).toBeNull();
  });

  it("rejects a token issued before a password change", () => {
    const passwordChangedAt = new Date("2026-08-29T12:00:00.000Z");
    const issuedAt = Math.floor(new Date("2026-08-29T11:59:00.000Z").getTime() / 1000);
    expect(resolveSessionUser(token({ iat: issuedAt }), { ...activeUser, passwordChangedAt })).toBeNull();
  });

  it("rejects missing or manipulated identity and role claims", () => {
    expect(resolveSessionUser(token({ sub: "other-user", userId: "other-user" }), activeUser)).toBeNull();
    expect(resolveSessionUser(token({ role: "PACIENTE" }), activeUser)).toBeNull();
    expect(resolveSessionUser(token({ role: "invalid" }), activeUser)).toBeNull();
  });

  it("rejects a token without iat when password revocation is active", () => {
    const currentUser = { ...activeUser, passwordChangedAt: new Date("2026-08-29T12:00:00.000Z") };
    expect(resolveSessionUser(token({ iat: undefined }), currentUser)).toBeNull();
  });
});
