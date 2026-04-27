import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/professional/dashboard/route";

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    professionalProfile: { findUnique: vi.fn() },
    appointment: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => prismaMock,
  isDatabaseUnavailableError: () => false,
}));

describe("GET /api/professional/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({ user: { id: "u-pro", role: "PROFESIONAL" } });
    requireRoleMock.mockReturnValue(null);
    prismaMock.professionalProfile.findUnique.mockResolvedValue({ id: "pro-1" });
    prismaMock.appointment.findMany.mockResolvedValue([
      {
        id: "apt-1",
        status: "SCHEDULED",
        reason: "Chequeo",
        serviceName: "Consulta",
        patient: {
          id: "pat-1",
          patientCode: "P-001",
          user: {
            name: "Ana",
            lastName: "Gomez",
            passwordHash: "should-not-leak",
            email: "ana@example.com",
          },
        },
        timeSlot: {
          startAt: new Date("2026-05-10T09:00:00.000Z"),
          endAt: new Date("2026-05-10T09:30:00.000Z"),
        },
      },
    ]);
  });

  it("retorna datos mínimos de paciente sin exponer campos internos", async () => {
    const response = await GET(new Request("http://localhost/api/professional/dashboard?date=2026-05-10"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.appointments[0].patient).toEqual({
      id: "pat-1",
      name: "Ana",
      lastName: "Gomez",
      patientCode: "P-001",
    });
    expect(body.appointments[0].patient.passwordHash).toBeUndefined();
    expect(body.appointments[0].patient.email).toBeUndefined();
  });
});
