import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentStatus } from "@prisma/client";

const mockRequireSession = vi.fn();

const mockPrisma = {
  appointment: {
    findFirst: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  professionalProfile: {
    findUnique: vi.fn(),
  },
  patientProfile: {
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
  isDatabaseUnavailableError: () => false,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/notifications", () => ({
  createReceptionNotifications: vi.fn(),
}));

vi.mock("@/lib/notifications/email", () => ({
  sendAppointmentEmail: vi.fn(),
}));

vi.mock("@/lib/appointments/events", () => ({
  recordAppointmentEvent: vi.fn(),
}));

vi.mock("@/lib/appointments/activity", () => ({
  buildAppointmentStatusNotification: () => ({
    type: "appointment_updated",
    title: "updated",
    activity: "updated",
  }),
}));

describe("clinical domain hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks patient operational actions when updating appointments", async () => {
    const { PATCH } = await import("@/app/api/appointments/[id]/route");

    mockRequireSession.mockResolvedValue({ user: { id: "patient-user", role: "PACIENTE" } });

    const response = await PATCH(
      new Request("http://localhost/api/appointments/appt-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: AppointmentStatus.CANCELLED, action: "mark_no_show" }),
      }),
      { params: Promise.resolve({ id: "appt-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mockPrisma.appointment.findFirst).not.toHaveBeenCalled();
  });

  it("rejects unsafe attachment URLs on professional uploads", async () => {
    const { POST } = await import("@/app/api/professional/attachments/route");

    mockRequireSession.mockResolvedValue({ user: { id: "pro-user", role: "PROFESIONAL" } });

    const response = await POST(
      new Request("http://localhost/api/professional/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "DOCUMENT",
          filename: "nota.txt",
          url: "javascript:alert('xss')",
          patientId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.appointment.findUnique).not.toHaveBeenCalled();
  });

  it("rejects patientId outside professional ownership when creating attachments", async () => {
    const { POST } = await import("@/app/api/professional/attachments/route");

    mockRequireSession.mockResolvedValue({ user: { id: "pro-user", role: "PROFESIONAL" } });
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ id: "pro-1" });
    mockPrisma.patientProfile.findFirst.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/professional/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "DOCUMENT",
          filename: "nota.txt",
          url: "https://example.com/file.pdf",
          patientId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(mockPrisma.patientProfile.findFirst).toHaveBeenCalled();
  });
});
