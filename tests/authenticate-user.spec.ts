import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticateUser } from "@/lib/auth/users";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

const mockedGetPrismaClient = vi.mocked(getPrismaClient);

describe("authenticateUser", () => {
  beforeEach(() => {
    mockedGetPrismaClient.mockReset();
    vi.restoreAllMocks();
  });

  it("authenticates a user with a valid password hash", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
    const findUnique = vi.fn().mockResolvedValue({
      id: "user-1",
      name: "Admin",
      email: "admin@dentpro.test",
      passwordHash: "hashed",
      role: "ADMINISTRADOR",
      passwordChangedAt: null,
      mfaEnabled: false,
      professional: null,
      patient: null,
    });

    mockedGetPrismaClient.mockReturnValue({ user: { findUnique } } as never);

    const result = await authenticateUser("admin@dentpro.test", "secret");

    expect(compareSpy).toHaveBeenCalledWith("secret", "hashed");
    expect(result).toMatchObject({ id: "user-1", role: "ADMINISTRADOR" });
  });

  it("rejects users without passwordHash", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare");
    const findUnique = vi.fn().mockResolvedValue({
      id: "user-sso",
      name: "SSO",
      email: "sso@dentpro.test",
      passwordHash: null,
      role: "PACIENTE",
      passwordChangedAt: null,
      mfaEnabled: false,
      professional: null,
      patient: null,
    });

    mockedGetPrismaClient.mockReturnValue({ user: { findUnique } } as never);

    const result = await authenticateUser("sso@dentpro.test", "secret");

    expect(compareSpy).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
