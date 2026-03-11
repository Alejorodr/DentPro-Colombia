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



  it("falls back to database auth when bypass is enabled but credentials do not match bypass user", async () => {
    process.env.TEST_AUTH_BYPASS = "1";
    process.env.DATABASE_URL = "postgresql://example";
    process.env.NEXTAUTH_URL = "http://127.0.0.1:3000";
    mockedAuthenticateUser.mockResolvedValue({
      id: "user-2",
      name: "Neon User",
      email: "real@dentpro.co",
      role: "ADMINISTRADOR",
      professionalId: null,
      patientId: null,
    });

    const result = await authorizeCredentials({ email: "real@dentpro.co", password: "secret" });

    expect(mockedAuthenticateUser).toHaveBeenCalledWith("real@dentpro.co", "secret");
    expect(result).toMatchObject({ id: "user-2", email: "real@dentpro.co" });
  });

  it("returns null when bypass is enabled, db is unavailable, and bypass credentials are invalid", async () => {
    process.env.TEST_AUTH_BYPASS = "1";
    process.env.DATABASE_URL = "";
    process.env.NEXTAUTH_URL = "http://127.0.0.1:3000";

    const result = await authorizeCredentials({ email: "wrong@dentpro.co", password: "bad" });

    expect(mockedAuthenticateUser).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("returns null for invalid credentials", async () => {
    mockedAuthenticateUser.mockResolvedValue(null);

    const result = await authorizeCredentials({ email: "admin@dentpro.test", password: "wrong" });

    expect(result).toBeNull();
  });
});
