import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/professionals/[id]/route";

const { getSessionUserMock, logAuditEventMock, prismaMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  logAuditEventMock: vi.fn(),
  prismaMock: {
    professionalProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: getSessionUserMock,
  isAuthorized: (role: string, allowed: string[]) => allowed.includes(role),
}));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: logAuditEventMock }));

async function callDelete(id: string) {
  return DELETE(new Request(`http://localhost/api/professionals/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
}

describe("DELETE /api/professionals/[id] (soft delete)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.professionalProfile.update.mockResolvedValue({});
  });

  it("rejects non-admin roles with 403", async () => {
    getSessionUserMock.mockResolvedValue({ id: randomUUID(), role: "RECEPCIONISTA" });
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("ADMINISTRADOR soft-deletes via update (never delete) and logs audit", async () => {
    const adminId = randomUUID();
    getSessionUserMock.mockResolvedValue({ id: adminId, role: "ADMINISTRADOR" });
    const id = randomUUID();
    const userId = randomUUID();
    prismaMock.professionalProfile.findUnique.mockResolvedValue({
      userId,
      active: true,
      user: { email: "doctora@example.com", active: true },
    });

    const res = await callDelete(id);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { active: false } });
    expect(prismaMock.professionalProfile.update).toHaveBeenCalledWith({ where: { id }, data: { active: false } });
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { userId: adminId, role: "ADMINISTRADOR" },
        action: "professional.deactivated",
        resourceType: "professional",
        resourceId: id,
        targetLabel: "doctora@example.com",
        status: "success",
        metadata: expect.objectContaining({ mode: "soft" }),
      }),
    );
  });

  it("is idempotent when already inactive", async () => {
    getSessionUserMock.mockResolvedValue({ id: randomUUID(), role: "ADMINISTRADOR" });
    prismaMock.professionalProfile.findUnique.mockResolvedValue({
      userId: randomUUID(),
      active: false,
      user: { email: "doctora@example.com", active: false },
    });

    const res = await callDelete(randomUUID());

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });

  it("returns 404 when professional does not exist", async () => {
    getSessionUserMock.mockResolvedValue({ id: randomUUID(), role: "ADMINISTRADOR" });
    prismaMock.professionalProfile.findUnique.mockResolvedValue(null);
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(404);
  });

  it("returns 500 (not an unhandled error) when the transaction fails", async () => {
    getSessionUserMock.mockResolvedValue({ id: randomUUID(), role: "ADMINISTRADOR" });
    prismaMock.professionalProfile.findUnique.mockResolvedValue({
      userId: randomUUID(),
      active: true,
      user: { email: "doctora@example.com", active: true },
    });
    prismaMock.$transaction.mockRejectedValue(new Error("db down"));
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(500);
  });
});
