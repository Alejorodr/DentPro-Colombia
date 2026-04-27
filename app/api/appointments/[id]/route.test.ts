import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/appointments/[id]/route";

const {
  requireSessionMock,
  requireRoleMock,
  parseJsonMock,
  prismaMock,
  createReceptionNotificationsMock,
  sendAppointmentEmailMock,
  recordAppointmentEventMock,
  buildAppointmentStatusNotificationMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  parseJsonMock: vi.fn(),
  prismaMock: {
    appointment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
  createReceptionNotificationsMock: vi.fn(),
  sendAppointmentEmailMock: vi.fn(),
  recordAppointmentEventMock: vi.fn(),
  buildAppointmentStatusNotificationMock: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));

vi.mock("@/app/api/_utils/validation", () => ({
  parseJson: parseJsonMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => prismaMock,
  isDatabaseUnavailableError: () => false,
}));

vi.mock("@/lib/notifications", () => ({
  createReceptionNotifications: createReceptionNotificationsMock,
}));

vi.mock("@/lib/notifications/email", () => ({
  sendAppointmentEmail: sendAppointmentEmailMock,
}));

vi.mock("@/lib/appointments/events", () => ({
  recordAppointmentEvent: recordAppointmentEventMock,
}));

vi.mock("@/lib/appointments/activity", () => ({
  buildAppointmentStatusNotification: buildAppointmentStatusNotificationMock,
}));

vi.mock("@/app/api/_utils/request", () => ({
  getRequestId: () => "req-1",
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PATCH /api/appointments/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({ user: { id: "u-rec", role: "RECEPCIONISTA" } });
    requireRoleMock.mockReturnValue(null);
    parseJsonMock.mockResolvedValue({ data: { status: "CANCELLED" }, error: null });
    prismaMock.appointment.findFirst.mockResolvedValue({
      id: "apt-1",
      status: "SCHEDULED",
      checkedInAt: null,
      timeSlotId: "slot-1",
      timeSlot: { startAt: new Date("2026-05-10T09:00:00.000Z") },
    });
    prismaMock.appointment.update.mockResolvedValue({
      id: "apt-1",
      reason: "Control",
      notes: null,
      status: "CANCELLED",
      patient: {
        id: "pat-1",
        patientCode: "P-001",
        user: {
          id: "u-pat",
          name: "Ana",
          lastName: "Gomez",
          email: "ana@example.com",
          role: "PACIENTE",
          passwordHash: "secret-hash",
        },
      },
      professional: {
        id: "pro-1",
        user: {
          id: "u-pro",
          name: "Luis",
          lastName: "Perez",
          email: "luis@example.com",
          role: "PROFESIONAL",
          passwordHash: "secret-hash",
        },
        specialty: { id: "sp-1", name: "Ortodoncia" },
      },
      timeSlot: {
        id: "slot-1",
        startAt: new Date("2026-05-10T09:00:00.000Z"),
        endAt: new Date("2026-05-10T09:30:00.000Z"),
      },
      service: { id: "srv-1", name: "Limpieza" },
    });
    buildAppointmentStatusNotificationMock.mockReturnValue({
      type: "appointment_cancelled",
      title: "Cita cancelada",
      activity: "Se canceló.",
    });
    createReceptionNotificationsMock.mockResolvedValue(undefined);
    sendAppointmentEmailMock.mockResolvedValue(true);
    recordAppointmentEventMock.mockResolvedValue(undefined);
  });

  it("no expone campos sensibles de user en la respuesta", async () => {
    const response = await PATCH(new Request("http://localhost/api/appointments/apt-1", { method: "PATCH" }), {
      params: Promise.resolve({ id: "apt-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.patient.user).toEqual({ name: "Ana", lastName: "Gomez" });
    expect(body.professional.user).toEqual({ name: "Luis", lastName: "Perez" });
    expect(body.patient.user.passwordHash).toBeUndefined();
    expect(body.professional.user.passwordHash).toBeUndefined();
    expect(body.patient.user.email).toBeUndefined();
    expect(body.professional.user.role).toBeUndefined();
  });
});
