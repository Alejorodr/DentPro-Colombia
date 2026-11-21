import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/patients/[id]/route";

const { requireSessionMock, logAuditEventMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  logAuditEventMock: vi.fn(),
  prismaMock: {
    patientProfile: { findUnique: vi.fn() },
    user: { update: vi.fn() },
  },
}));

vi.mock("@/lib/authz", async () => {
  const actual = await vi.importActual<typeof import("@/lib/authz")>("@/lib/authz");
  return { ...actual, requireSession: requireSessionMock };
});
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: logAuditEventMock }));

function callPatch(id: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost/api/patients/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("PATCH /api/patients/[id] role guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({ user: { id: randomUUID(), role: "RECEPCIONISTA" } });
  });

  it.each(["ADMINISTRADOR", "PROFESIONAL", "RECEPCIONISTA"])(
    "refuses to edit a leftover patient profile owned by a %s account",
    async (role) => {
      prismaMock.patientProfile.findUnique.mockResolvedValue({ userId: randomUUID(), user: { role, email: "staff@dentpro.co" } });
      const res = await callPatch(randomUUID(), { email: "atacante@example.com" });
      expect(res.status).toBe(404);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    },
  );

  it("still lets reception edit a real patient", async () => {
    prismaMock.patientProfile.findUnique.mockResolvedValue({ userId: randomUUID(), user: { role: "PACIENTE", email: "p@example.com" } });
    prismaMock.user.update.mockResolvedValue({ id: "u1", email: "p@example.com", patient: {} });
    const res = await callPatch(randomUUID(), { phone: "3001234567", email: "P@example.com" });
    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
  });

  it("forbids reception from changing a patient's login email", async () => {
    prismaMock.patientProfile.findUnique.mockResolvedValue({ userId: randomUUID(), user: { role: "PACIENTE", email: "p@example.com" } });
    const res = await callPatch(randomUUID(), { email: "otro@example.com" });
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("lets an admin change a patient's email", async () => {
    requireSessionMock.mockResolvedValue({ user: { id: randomUUID(), role: "ADMINISTRADOR" } });
    prismaMock.patientProfile.findUnique.mockResolvedValue({ userId: "u1", user: { role: "PACIENTE", email: "p@example.com" } });
    prismaMock.user.update.mockResolvedValue({ id: "u1", email: "nuevo@example.com", patient: {} });
    const res = await callPatch(randomUUID(), { email: "Nuevo@example.com" });
    expect(res.status).toBe(200);
    expect(prismaMock.user.update.mock.calls[0][0].data.email).toBe("nuevo@example.com");
  });
});
