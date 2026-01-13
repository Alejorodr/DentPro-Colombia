import { beforeEach, describe, expect, it, vi } from "vitest";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { authenticateUser } from "@/lib/auth/users";

vi.mock("@/lib/auth/users", () => ({
  authenticateUser: vi.fn(),
}));

const mockedAuthenticateUser = vi.mocked(authenticateUser);

describe("authorizeCredentials", () => {
  beforeEach(() => {
    mockedAuthenticateUser.mockReset();
    process.env.TEST_AUTH_BYPASS = "0";
  });

  it("returns a user for valid credentials", async () => {
    mockedAuthenticateUser.mockResolvedValue({
      id: "user-1",
      name: "Admin",
      email: "admin@dentpro.test",
      role: "ADMINISTRADOR",
      professionalId: null,
      patientId: null,
    });

    const result = await authorizeCredentials({ email: "admin@dentpro.test", password: "secret" });

    expect(result).toMatchObject({
      id: "user-1",
      role: "ADMINISTRADOR",
      defaultDashboardPath: getDefaultDashboardPath("ADMINISTRADOR"),
    });
  });

  it("returns null for invalid credentials", async () => {
    mockedAuthenticateUser.mockResolvedValue(null);

    const result = await authorizeCredentials({ email: "admin@dentpro.test", password: "wrong" });

    expect(result).toBeNull();
  });
});
