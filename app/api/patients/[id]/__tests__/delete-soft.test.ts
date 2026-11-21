import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/patients/[id]/route";

const { requireSessionMock, logAuditEventMock, prismaMock } = vi.hoisted(() => {
  const prisma = {
    patientProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return {
    requireSessionMock: vi.fn(),
    logAuditEventMock: vi.fn(),
    prismaMock: prisma,
  };
});

vi.mock("@/lib/authz", async () => {
  const actual = await vi.importActual<typeof import("@/lib/authz")>("@/lib/authz");
  return { ...actual, requireSession: requireSessionMock };
});
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: logAuditEventMock }));

function session(role: string) {
  return { user: { id: randomUUID(), role } };
}

async function callDelete(id: string) {
  return DELETE(new Request(`http://localhost/api/patients/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
}

describe("DELETE /api/patients/[id] (soft delete)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.patientProfile.update.mockResolvedValue({});
  });

  it("rejects RECEPCIONISTA with 403 and touches nothing", async () => {
    requireSessionMock.mockResolvedValue(session("RECEPCIONISTA"));
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(403);
    expect(prismaMock.patientProfile.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("returns 401 without session", async () => {
    requireSessionMock.mockResolvedValue({ error: { status: 401, message: "No autorizado." } });
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(401);
  });

  it("returns 404 when patient does not exist", async () => {
    requireSessionMock.mockResolvedValue(session("ADMINISTRADOR"));
    prismaMock.patientProfile.findUnique.mockResolvedValue(null);
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(404);
  });

  it("ADMINISTRADOR soft-deletes via update (never delete) and logs audit", async () => {
    const admin = session("ADMINISTRADOR");
    requireSessionMock.mockResolvedValue(admin);
    const id = randomUUID();
    const userId = randomUUID();
    prismaMock.patientProfile.findUnique.mockResolvedValue({
      userId,
      active: true,
      user: { email: "paciente@example.com", active: true, role: "PACIENTE" },
    });

    const res = await callDelete(id);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: userId }, data: { active: false } });
    expect(prismaMock.patientProfile.update).toHaveBeenCalledWith({ where: { id }, data: { active: false } });
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { userId: admin.user.id, role: "ADMINISTRADOR" },
        action: "patient.deactivated",
        resourceType: "patient",
        resourceId: id,
        targetLabel: "paciente@example.com",
        status: "success",
      }),
    );
  });

  it("is idempotent when the patient is already inactive", async () => {
    requireSessionMock.mockResolvedValue(session("ADMINISTRADOR"));
    prismaMock.patientProfile.findUnique.mockResolvedValue({
      userId: randomUUID(),
      active: false,
      user: { email: "paciente@example.com", active: false, role: "PACIENTE" },
    });

    const res = await callDelete(randomUUID());

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });

  it("returns 500 (not an unhandled error) when the transaction fails", async () => {
    requireSessionMock.mockResolvedValue(session("ADMINISTRADOR"));
    prismaMock.patientProfile.findUnique.mockResolvedValue({
      userId: randomUUID(),
      active: true,
      user: { email: "paciente@example.com", active: true, role: "PACIENTE" },
    });
    prismaMock.$transaction.mockRejectedValue(new Error("db down"));

    const res = await callDelete(randomUUID());

    expect(res.status).toBe(500);
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });
});
