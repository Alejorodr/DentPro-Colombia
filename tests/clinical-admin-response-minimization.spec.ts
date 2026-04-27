import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSession = vi.fn();
const mockRequireRole = vi.fn();
const mockGetSessionUser = vi.fn();

const mockPrisma = {
  professionalProfile: {
    findUnique: vi.fn(),
  },
  appointment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  clinicalEpisode: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  patientProfile: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
  isAuthorized: vi.fn(() => true),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock("@/lib/clinical/access", () => ({
  getProfessionalProfile: vi.fn().mockResolvedValue({ id: "pro-1" }),
}));

vi.mock("@/lib/clinical/access-log", () => ({
  logClinicalAccess: vi.fn().mockResolvedValue(undefined),
}));

describe("clinical/admin response minimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockReturnValue(null);
  });

  it("uses minimal select and sanitized payload in professional appointment detail", async () => {
    const { GET } = await import("@/app/api/professional/appointment/[id]/route");

    mockRequireSession.mockResolvedValue({ user: { id: "user-pro", role: "PROFESIONAL" } });
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ id: "pro-1" });
    mockPrisma.appointment.findUnique.mockResolvedValue({
      id: "appt-1",
      professionalId: "pro-1",
      patientId: "pat-1",
      status: "CONFIRMED",
      reason: "Control",
      serviceName: "Limpieza",
      timeSlot: { startAt: new Date("2026-03-01T10:00:00.000Z"), endAt: new Date("2026-03-01T10:30:00.000Z") },
      patient: {
        id: "pat-1",
        patientCode: "P-100",
        dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
        gender: "F",
        insuranceProvider: "EPS",
        insuranceStatus: "ACTIVE",
        user: { name: "Ana", lastName: "Pérez", email: "ana@demo.com" },
        allergies: [],
      },
      clinicalNotes: [],
      prescription: null,
      attachments: [],
    });
    mockPrisma.appointment.findMany.mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/api/professional/appointment/appt-1"), {
      params: Promise.resolve({ id: "appt-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "appt-1" },
        select: expect.any(Object),
      }),
    );

    const payload = await response.json();
    expect(payload.patient).toEqual(
      expect.objectContaining({ id: "pat-1", name: "Ana", lastName: "Pérez", email: "ana@demo.com" }),
    );
    expect(payload.patient).not.toHaveProperty("userId");
    expect(payload).not.toHaveProperty("patient.user");
  });

  it("returns DTO acotado in clinical episode PATCH", async () => {
    const { PATCH } = await import("@/app/api/clinical/episodes/[episodeId]/route");

    mockRequireSession.mockResolvedValue({ user: { id: "pro-user", role: "PROFESIONAL" } });
    mockPrisma.clinicalEpisode.findFirst.mockResolvedValue({
      id: "ep-1",
      patientId: "pat-1",
      professionalId: "pro-1",
    });
    mockPrisma.clinicalEpisode.update.mockResolvedValue({
      id: "ep-1",
      date: new Date("2026-03-01T10:00:00.000Z"),
      reason: "Dolor",
      notes: "Nota",
      diagnosis: "Dx",
      treatmentPlan: "Plan",
      visibleToPatient: true,
      updatedAt: new Date("2026-03-01T11:00:00.000Z"),
      updatedByUserId: "pro-user",
    });

    const response = await PATCH(
      new Request("http://localhost/api/clinical/episodes/ep-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Nota" }),
      }),
      { params: Promise.resolve({ episodeId: "ep-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.clinicalEpisode.update).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.any(Object) }),
    );

    const payload = await response.json();
    expect(payload.episode).toEqual(expect.objectContaining({ id: "ep-1", diagnosis: "Dx" }));
    expect(payload.episode).not.toHaveProperty("updatedByUserId");
    expect(payload.episode).not.toHaveProperty("patientId");
  });

  it("uses select mínimo in patients listing without auth internals", async () => {
    const { GET } = await import("@/app/api/patients/route");

    mockRequireSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMINISTRADOR" } });
    mockPrisma.patientProfile.findMany.mockResolvedValue([
      {
        id: "pat-1",
        userId: "usr-1",
        active: true,
        patientCode: "P-001",
        phone: "3000000000",
        documentId: "CC1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        user: {
          id: "usr-1",
          email: "paciente@demo.com",
          role: "PACIENTE",
          name: "Ana",
          lastName: "Pérez",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      },
    ]);
    mockPrisma.patientProfile.count.mockResolvedValue(1);

    const response = await GET(new Request("http://localhost/api/patients?page=1&pageSize=10"));

    expect(response.status).toBe(200);
    expect(mockPrisma.patientProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.any(Object) }),
    );

    const payload = await response.json();
    expect(payload.items[0].user).not.toHaveProperty("passwordHash");
    expect(payload.items[0].user).not.toHaveProperty("mfaSecret");
  });
});
