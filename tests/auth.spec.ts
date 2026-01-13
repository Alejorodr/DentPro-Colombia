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
});
