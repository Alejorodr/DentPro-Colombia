import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as rescheduleAppointment } from "@/app/api/appointments/[id]/reschedule/route";

const mockRequireSession = vi.fn();
const mockRequireRole = vi.fn();
const mockRequireOwnershipOrRole = vi.fn();
const mockCreateReceptionNotifications = vi.fn();
const mockSendAppointmentEmail = vi.fn();

const mockPrisma = {
  appointment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  timeSlot: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  patientProfile: {
    findUnique: vi.fn(),
  },
  professionalProfile: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
  requireRole: () => mockRequireRole(),
  requireOwnershipOrRole: () => mockRequireOwnershipOrRole(),
}));

vi.mock("@/lib/notifications", () => ({
  createReceptionNotifications: () => mockCreateReceptionNotifications(),
}));

vi.mock("@/lib/notifications/email", () => ({
  sendAppointmentEmail: () => mockSendAppointmentEmail(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

describe("appointment rescheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMINISTRADOR" } });
    mockRequireRole.mockReturnValue(null);
    mockRequireOwnershipOrRole.mockReturnValue(null);
    mockPrisma.timeSlot.findMany.mockResolvedValue([]);
  });

  it("returns 409 when a slot becomes unavailable between reschedules", async () => {
    const appointment = {
      id: "appt-1",
      patientId: "patient-1",
      professionalId: "prof-1",
      timeSlotId: "slot-old",
      timeSlot: {
        id: "slot-old",
        professionalId: "prof-1",
        startAt: new Date("2030-01-01T10:00:00Z"),
        endAt: new Date("2030-01-01T11:00:00Z"),
        status: "BOOKED",
      },
    };
    const availableSlot = {
      id: "slot-new",
      professionalId: "prof-1",
      startAt: new Date("2030-01-02T10:00:00Z"),
      endAt: new Date("2030-01-02T11:00:00Z"),
      status: "AVAILABLE",
    };
    const bookedSlot = { ...availableSlot, status: "BOOKED" };

    mockPrisma.appointment.findUnique.mockResolvedValue(appointment);
    mockPrisma.timeSlot.findUnique
      .mockResolvedValueOnce(availableSlot)
      .mockResolvedValueOnce(bookedSlot);

    const updatedAppointment = {
      ...appointment,
      timeSlotId: availableSlot.id,
      professionalId: availableSlot.professionalId,
      timeSlot: availableSlot,
      patient: { user: { id: "user-patient", email: "patient@example.com", name: "Ana", lastName: "Lopez" } },
      professional: {
        user: { id: "user-prof", email: "prof@example.com", name: "Luis", lastName: "Perez" },
        specialty: { name: "Odontología" },
      },
      service: { name: "Control" },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      mockPrisma.timeSlot.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
      mockPrisma.appointment.update.mockResolvedValue(updatedAppointment);
      return callback(mockPrisma);
    });

    const requestBody = JSON.stringify({ timeSlotId: availableSlot.id });
    const request = new Request("http://localhost/api/appointments/appt-1/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const firstResponse = await rescheduleAppointment(request, {
      params: Promise.resolve({ id: appointment.id }),
    });
    expect(firstResponse.status).toBe(200);

    const secondResponse = await rescheduleAppointment(
      new Request("http://localhost/api/appointments/appt-1/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      }),
      { params: Promise.resolve({ id: appointment.id }) },
    );

    expect(secondResponse.status).toBe(409);
    const payload = await secondResponse.json();
    expect(payload).toMatchObject({ error: "El nuevo slot no está disponible.", suggestions: [] });
  });
});
