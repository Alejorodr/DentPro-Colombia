import { beforeEach, describe, expect, it, vi } from "vitest";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { authenticateUser, findUserByEmail } from "@/lib/auth/users";

vi.mock("@/lib/auth/users", () => ({
  authenticateUser: vi.fn(),
  findUserByEmail: vi.fn(),
}));

const mockedAuthenticateUser = vi.mocked(authenticateUser);
const mockedFindUserByEmail = vi.mocked(findUserByEmail);

describe("authorizeCredentials", () => {
  beforeEach(() => {
    mockedAuthenticateUser.mockReset();
    mockedFindUserByEmail.mockReset();
    process.env.TEST_AUTH_BYPASS = "0";
    process.env.DATABASE_URL = "postgresql://example";
    process.env.NEXTAUTH_URL = "";
  });

  it("returns a user for valid credentials", async () => {
    mockedAuthenticateUser.mockResolvedValue({
      id: "user-1",
      name: "Admin",
      email: "admin@dentpro.test",
      role: "ADMINISTRADOR",
      active: true,
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

  it("normalizes email before database authentication", async () => {
    mockedAuthenticateUser.mockResolvedValue({
      id: "user-1",
      name: "Admin",
      email: "admin@dentpro.test",
      role: "ADMINISTRADOR",
      active: true,
      professionalId: null,
      patientId: null,
    });

    await authorizeCredentials({ email: "  Admin@DentPro.Test  ", password: "secret" });

    expect(mockedAuthenticateUser).toHaveBeenCalledWith("admin@dentpro.test", "secret");
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
      active: true,
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

  it("uses persisted bypass user when bypass credentials are valid", async () => {
    process.env.TEST_AUTH_BYPASS = "1";
    process.env.DATABASE_URL = "postgresql://example";
    mockedFindUserByEmail.mockResolvedValue({
      id: "admin-id",
      name: "Admin",
      email: "admin@dentpro.test",
      role: "ADMINISTRADOR",
      active: true,
      professionalId: null,
      patientId: null,
    });

    const result = await authorizeCredentials({ email: "admin@dentpro.test", password: "Test1234!" });

    expect(mockedFindUserByEmail).toHaveBeenCalledWith("admin@dentpro.test");
    expect(result).toMatchObject({
      id: "admin-id",
      email: "admin@dentpro.test",
      role: "ADMINISTRADOR",
    });
  });

  it("does not query the database for valid bypass credentials when db is unavailable", async () => {
    process.env.TEST_AUTH_BYPASS = "1";
    process.env.DATABASE_URL = "";
    process.env.NEXTAUTH_URL = "http://127.0.0.1:3000";

    const result = await authorizeCredentials({ email: " admin@dentpro.test ", password: "Test1234!" });

    expect(mockedFindUserByEmail).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      email: "admin@dentpro.test",
      role: "ADMINISTRADOR",
    });
  });

  it("returns null for invalid credentials", async () => {
    mockedAuthenticateUser.mockResolvedValue(null);

    const result = await authorizeCredentials({ email: "admin@dentpro.test", password: "wrong" });

    expect(result).toBeNull();
  });
});
