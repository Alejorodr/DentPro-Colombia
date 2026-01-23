import { beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { authOptions } from "@/auth";
import { getDefaultDashboardPath } from "@/lib/auth/roles";
import * as users from "@/lib/auth/users";

let mockedFindUserById: MockInstance;

describe("auth options", () => {
  beforeAll(() => {
    mockedFindUserById = vi.spyOn(users, "findUserById");
  });

  beforeEach(() => {
    mockedFindUserById.mockReset();
  });

  it("propagates role and ids into the jwt token", async () => {
    const jwtCallback = authOptions.callbacks.jwt as unknown as (params: {
      token: Record<string, unknown>;
      user?: Record<string, unknown> | null;
    }) => Promise<Record<string, unknown>>;

    const token = await jwtCallback({
      token: {},
      user: {
        id: "user-2",
        role: "PROFESIONAL",
        professionalId: "prof-1",
        defaultDashboardPath: getDefaultDashboardPath("PROFESIONAL"),
      },
    });

    expect(token).toMatchObject({
      role: "PROFESIONAL",
      userId: "user-2",
      professionalId: "prof-1",
      defaultDashboardPath: getDefaultDashboardPath("PROFESIONAL"),
    });
  });

  it("loads role from the database when missing", async () => {
    mockedFindUserById.mockResolvedValue({
      id: "user-3",
      name: "User",
      email: "user@dentpro.test",
      role: "RECEPCIONISTA",
      professionalId: null,
      patientId: null,
      passwordChangedAt: null,
    });

    const jwtCallback = authOptions.callbacks.jwt as unknown as (params: {
      token: Record<string, unknown>;
      user?: Record<string, unknown> | null;
    }) => Promise<Record<string, unknown>>;

    const token = await jwtCallback({
      token: { sub: "user-3" },
      user: null,
    });

    expect(token).toMatchObject({
      role: "RECEPCIONISTA",
      userId: "user-3",
    });
  });

  it("copies role into the session payload", async () => {
    const sessionCallback = authOptions.callbacks.session as unknown as (params: {
      session: Record<string, unknown>;
      token: Record<string, unknown>;
    }) => Promise<Record<string, unknown>>;

    const session = await sessionCallback({
      session: { user: { name: "User", email: "user@dentpro.test", image: null } },
      token: { role: "PACIENTE", userId: "user-4" },
    });

    expect(session).toMatchObject({
      user: {
        id: "user-4",
        role: "PACIENTE",
      },
    });
  });

  it("uses strict sameSite cookies for the session token", () => {
    expect(authOptions.cookies?.sessionToken.options.sameSite).toBe("strict");
  });

  it("invalidates sessions issued before a password reset", async () => {
    const passwordChangedAt = new Date("2024-01-02T00:00:00.000Z");
    mockedFindUserById.mockResolvedValue({
      id: "user-5",
      name: "User",
      email: "user@dentpro.test",
      role: "ADMINISTRADOR",
      professionalId: null,
      patientId: null,
      passwordChangedAt,
    });

    const jwtCallback = authOptions.callbacks.jwt as unknown as (params: {
      token: Record<string, unknown>;
      user?: Record<string, unknown> | null;
    }) => Promise<Record<string, unknown>>;

    const sessionCallback = authOptions.callbacks.session as unknown as (params: {
      session: Record<string, unknown>;
      token: Record<string, unknown>;
    }) => Promise<Record<string, unknown> | null>;

    const token = await jwtCallback({
      token: { sub: "user-5", iat: Math.floor(new Date("2024-01-01T00:00:00.000Z").getTime() / 1000) },
      user: null,
    });

    expect(token).toMatchObject({ invalidated: true });

    const session = await sessionCallback({
      session: { user: { name: "User", email: "user@dentpro.test", image: null } },
      token,
    });

    expect(session).toBeNull();
  });
});
