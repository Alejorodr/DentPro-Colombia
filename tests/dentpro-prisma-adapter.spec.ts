import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn().mockResolvedValue(undefined) }));

const createUserMock = vi.fn();
const baseCreateUserMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    user: {
      create: createUserMock,
    },
  }),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({
    createUser: baseCreateUserMock,
  }),
}));

import { DentProPrismaAdapter } from "@/lib/auth/dentpro-prisma-adapter";

describe("DentProPrismaAdapter", () => {
  it("crea paciente seguro para SSO", async () => {
    createUserMock.mockResolvedValue({ id: "u1", email: "nuevo@test.com" });
    const adapter = DentProPrismaAdapter();

    await adapter.createUser?.({
      email: "Nuevo@Test.com",
      name: "Nuevo Usuario",
      image: "https://cdn/avatar.png",
      emailVerified: null,
    } as any);

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "nuevo@test.com",
          role: "PACIENTE",
          passwordHash: null,
          patient: { create: { avatarUrl: "https://cdn/avatar.png" } },
        }),
      }),
    );
  });
});
