import { describe, expect, it, vi } from "vitest";

const { findUserByIdMock } = vi.hoisted(() => ({
  findUserByIdMock: vi.fn(),
}));

vi.mock("@/lib/auth/users", () => ({
  findUserById: findUserByIdMock,
  findUserByEmail: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/lib/auth/google-signin-guard", () => ({ validateGoogleSignIn: vi.fn().mockResolvedValue(true) }));

describe("jwt callback persists mustChangePassword", () => {
  it("sets mustChangePassword=true in token when db user has it set", async () => {
    findUserByIdMock.mockResolvedValue({
      id: "user-1",
      role: "PACIENTE",
      active: true,
      mustChangePassword: true,
      professionalId: null,
      patientId: null,
      passwordChangedAt: null,
    });

    // Import the config AFTER mocks are set up
    const { authConfig } = await import("@/auth.config");
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwt callback missing");

    const token = await jwtCallback({
      token: { sub: "user-1", iat: Math.floor(Date.now() / 1000) },
      user: { id: "user-1", email: "test@test.com", role: "PACIENTE" as const },
      account: null,
      trigger: "signIn",
    } as Parameters<typeof jwtCallback>[0]);

    expect((token as { mustChangePassword?: boolean }).mustChangePassword).toBe(true);
  });

  it("sets mustChangePassword=false when db user does not have it set", async () => {
    findUserByIdMock.mockResolvedValue({
      id: "user-2",
      role: "PACIENTE",
      active: true,
      mustChangePassword: false,
      professionalId: null,
      patientId: null,
      passwordChangedAt: null,
    });

    const { authConfig } = await import("@/auth.config");
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwt callback missing");

    const token = await jwtCallback({
      token: { sub: "user-2", iat: Math.floor(Date.now() / 1000) },
      user: { id: "user-2", email: "other@test.com", role: "PACIENTE" as const },
      account: null,
      trigger: "signIn",
    } as Parameters<typeof jwtCallback>[0]);

    expect((token as { mustChangePassword?: boolean }).mustChangePassword).toBe(false);
  });
});
