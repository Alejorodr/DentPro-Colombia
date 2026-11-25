// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, requireRoleMock, refreshMock, auditMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  refreshMock: vi.fn(),
  auditMock: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireSession: requireSessionMock, requireRole: requireRoleMock }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: auditMock }));
vi.mock("@/lib/scheduling/slot-inventory", () => ({ refreshFutureInventoryForProfessional: refreshMock }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: vi.fn() }));

import { GET, PUT } from "@/app/api/admin/cups/route";
import { getPrismaClient } from "@/lib/prisma";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const PRO_A = "22222222-2222-4222-8222-222222222222";
const PRO_B = "33333333-3333-4333-8333-333333333333";

function makePrisma() {
  const tx = {
    clinicProcedure: { upsert: vi.fn().mockResolvedValue({ id: "proc-1", cupsCode: "237301", serviceId: SERVICE_ID }) },
    professionalProcedure: { deleteMany: vi.fn(), createMany: vi.fn() },
    professionalService: { findMany: vi.fn().mockResolvedValue([]), createMany: vi.fn() },
  };
  return {
    tx,
    clinicProcedure: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn() },
    service: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue({ id: SERVICE_ID }) },
    professionalProfile: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(2) },
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };
}

const put = (body: Record<string, unknown>) =>
  PUT(
    new Request("http://localhost/api/admin/cups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

let prisma: ReturnType<typeof makePrisma>;

beforeEach(() => {
  vi.clearAllMocks();
  prisma = makePrisma();
  vi.mocked(getPrismaClient).mockReturnValue(prisma as never);
  requireSessionMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMINISTRADOR" } });
  requireRoleMock.mockReturnValue(null);
});

describe("/api/admin/cups (DOG-42)", () => {
  it("rechaza a quien no es administrador", async () => {
    requireRoleMock.mockReturnValue({ status: 403 });
    const response = await put({ cupsCode: "237301", offered: false });
    expect(response.status).toBe(403);
    expect(prisma.clinicProcedure.deleteMany).not.toHaveBeenCalled();
  });

  it("GET devuelve procedimientos con sus profesionales y nombres completos", async () => {
    prisma.clinicProcedure.findMany.mockResolvedValue([
      { cupsCode: "237301", serviceId: SERVICE_ID, professionals: [{ professionalId: PRO_A }] },
    ]);
    prisma.professionalProfile.findMany.mockResolvedValue([
      { id: PRO_A, specialty: { name: "Endodoncia" }, user: { name: "Laura", lastName: "Gómez" } },
    ]);

    const body = await (await GET()).json();

    expect(body.procedures).toEqual([{ cupsCode: "237301", serviceId: SERVICE_ID, professionalIds: [PRO_A] }]);
    expect(body.professionals).toEqual([{ id: PRO_A, name: "Laura Gómez", specialty: "Endodoncia" }]);
  });

  it("rechaza un código que no está en el catálogo", async () => {
    const response = await put({ cupsCode: "999999", offered: true });
    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("desmarcar un procedimiento lo borra", async () => {
    const response = await put({ cupsCode: "237301", offered: false });
    expect(response.status).toBe(200);
    expect(prisma.clinicProcedure.deleteMany).toHaveBeenCalledWith({ where: { cupsCode: "237301" } });
    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({ action: "cups.procedure.removed" }));
  });

  it("guarda servicio y profesionales, y asigna el servicio a quien no lo tenía", async () => {
    prisma.tx.professionalService.findMany.mockResolvedValue([{ professionalId: PRO_A }]);

    const response = await put({ cupsCode: "237301", offered: true, serviceId: SERVICE_ID, professionalIds: [PRO_A, PRO_B] });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.tx.professionalProcedure.createMany).toHaveBeenCalledWith({
      data: [
        { professionalId: PRO_A, procedureId: "proc-1" },
        { professionalId: PRO_B, procedureId: "proc-1" },
      ],
    });
    expect(prisma.tx.professionalService.createMany).toHaveBeenCalledWith({
      data: [{ professionalId: PRO_B, serviceId: SERVICE_ID }],
    });
    expect(body.createdAssignments).toEqual([PRO_B]);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledWith(expect.objectContaining({ professionalId: PRO_B }));
  });

  it("sin servicio no crea asignaciones de agenda", async () => {
    prisma.professionalProfile.count.mockResolvedValue(1);
    const response = await put({ cupsCode: "237301", offered: true, serviceId: null, professionalIds: [PRO_A] });
    expect(response.status).toBe(200);
    expect(prisma.tx.professionalService.createMany).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("rechaza profesionales inexistentes o inactivos", async () => {
    prisma.professionalProfile.count.mockResolvedValue(1);
    const response = await put({ cupsCode: "237301", offered: true, serviceId: SERVICE_ID, professionalIds: [PRO_A, PRO_B] });
    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza un servicio que no existe", async () => {
    prisma.service.findUnique.mockResolvedValue(null);
    const response = await put({ cupsCode: "237301", offered: true, serviceId: SERVICE_ID });
    expect(response.status).toBe(400);
  });
});
