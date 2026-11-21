import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/users/[id]/route";

const { requireSessionMock, requireRoleMock, logAuditEventMock, prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    patientProfile: { updateMany: vi.fn(), delete: vi.fn() },
    professionalProfile: { updateMany: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  };
  return {
    requireSessionMock: vi.fn(),
    requireRoleMock: vi.fn(),
    logAuditEventMock: vi.fn(),
    prismaMock,
  };
});

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: logAuditEventMock }));

const ADMIN_SESSION = { user: { id: randomUUID(), role: "ADMINISTRADOR" as const } };

async function callDelete(targetId: string) {
  return DELETE(
    new Request(`http://localhost/api/users/${targetId}`, { method: "DELETE" }),
    { params: Promise.resolve({ id: targetId }) },
  );
}

describe("DELETE /api/users/[id] (soft delete)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.patientProfile.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.professionalProfile.updateMany.mockResolvedValue({ count: 0 });
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(404);
  });

  it("rejects self-deactivation with 403", async () => {
    const res = await callDelete(ADMIN_SESSION.user.id);
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("returns 400 when deactivating the last active ADMINISTRADOR", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "ADMINISTRADOR", active: true });
    prismaMock.user.count.mockResolvedValue(0);
    const res = await callDelete(id);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/único administrador/);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("allows deactivating an ADMINISTRADOR when others exist", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "ADMINISTRADOR", active: true });
    prismaMock.user.count.mockResolvedValue(1);
    const res = await callDelete(id);
    expect(res.status).toBe(200);
  });

  it("deactivates the user and profiles instead of hard-deleting", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "PACIENTE", active: true, email: "p@example.com" });
    const res = await callDelete(id);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id }, data: { active: false } });
    expect(prismaMock.patientProfile.updateMany).toHaveBeenCalledWith({ where: { userId: id }, data: { active: false } });
    expect(prismaMock.professionalProfile.updateMany).toHaveBeenCalledWith({ where: { userId: id }, data: { active: false } });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(prismaMock.patientProfile.delete).not.toHaveBeenCalled();
    expect(prismaMock.professionalProfile.delete).not.toHaveBeenCalled();
    expect(logAuditEventMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "user.deactivated",
      resourceId: id,
      metadata: expect.objectContaining({ mode: "soft", previousRole: "PACIENTE" }),
    }));
  });

  it("returns 500 without auditing when the transaction fails", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "PROFESIONAL", active: true });
    prismaMock.$transaction.mockRejectedValue(new Error("db down"));
    const res = await callDelete(id);
    expect(res.status).toBe(500);
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });
});
