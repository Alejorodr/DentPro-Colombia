import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as rescheduleAppointment } from "@/app/api/appointments/[id]/reschedule/route";

const mockRequireSession = vi.fn();
const mockRequireRole = vi.fn();
const mockRequireOwnershipOrRole = vi.fn();
const mockCreateReceptionNotifications = vi.fn();
const mockSendAppointmentEmail = vi.fn();

const mockPrisma = {
  appointment: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  timeSlot: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  service: {
    findUnique: vi.fn(),
  },
  professionalService: {
    findMany: vi.fn(),
  },
  clinicHoliday: {
    findMany: vi.fn(),
  },
  professionalWorkingSchedule: {
    findMany: vi.fn(),
  },
  professionalScheduleAdjustment: {
    findMany: vi.fn(),
  },
  professionalUnavailability: {
    findMany: vi.fn(),
  },
  patientProfile: {
    findUnique: vi.fn(),
  },
  professionalProfile: {
    findUnique: vi.fn(),
  },
  appointmentEvent: {
    create: vi.fn(),
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
    mockPrisma.service.findUnique.mockResolvedValue({ id: "service-1", active: true, durationMinutes: 60 });
    mockPrisma.professionalService.findMany.mockResolvedValue([
      {
        professionalId: "prof-1",
        appointmentDurationMinutes: null,
        bufferBeforeMinutes: null,
        bufferAfterMinutes: null,
      },
    ]);
    mockPrisma.clinicHoliday.findMany.mockResolvedValue([]);
    mockPrisma.professionalWorkingSchedule.findMany.mockResolvedValue([
      { professionalId: "prof-1", dayOfWeek: 3, startTime: "00:00", endTime: "23:59" },
    ]);
    mockPrisma.professionalScheduleAdjustment.findMany.mockResolvedValue([]);
    mockPrisma.professionalUnavailability.findMany.mockResolvedValue([]);
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.findFirst.mockResolvedValue(null);
  });

  it("returns 409 when a slot becomes unavailable between reschedules", async () => {
    const appointment = {
      id: "appt-1",
      patientId: "patient-1",
      professionalId: "prof-1",
      status: "SCHEDULED",
      timeSlotId: "11111111-1111-4111-8111-111111111111",
      timeSlot: {
        id: "11111111-1111-4111-8111-111111111111",
        professionalId: "prof-1",
        startAt: new Date("2030-01-01T10:00:00Z"),
        endAt: new Date("2030-01-01T11:00:00Z"),
        status: "BOOKED",
      },
    };
    const availableSlot = {
      id: "22222222-2222-4222-8222-222222222222",
      professionalId: "prof-1",
      startAt: new Date("2030-01-02T10:00:00Z"),
      endAt: new Date("2030-01-02T11:00:00Z"),
      status: "AVAILABLE",
    };
    const bookedSlot = { ...availableSlot, status: "BOOKED" };
    const candidateSlotForAvailability = {
      ...availableSlot,
      professional: {
        id: "prof-1",
        user: { name: "Luis", lastName: "Perez" },
        specialty: null,
      },
    };

    mockPrisma.appointment.findFirst.mockResolvedValue(appointment);
    mockPrisma.timeSlot.findMany
      .mockResolvedValueOnce([candidateSlotForAvailability])
      .mockResolvedValue([]);
    mockPrisma.timeSlot.findUnique
      .mockResolvedValueOnce(availableSlot)
      .mockResolvedValueOnce(availableSlot)
      .mockResolvedValueOnce(bookedSlot)
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
    expect(payload).toMatchObject({ error: "El horario seleccionado no está disponible operativamente.", suggestions: [] });
  });

  describe("booking abuse guards", () => {
    const baseAppointment = {
      id: "appt-2",
      patientId: "patient-1",
      professionalId: "prof-1",
      serviceId: "service-1",
      status: "CONFIRMED",
      timeSlotId: "33333333-3333-4333-8333-333333333333",
      timeSlot: {
        id: "33333333-3333-4333-8333-333333333333",
        professionalId: "prof-1",
        startAt: new Date("2030-01-01T10:00:00Z"),
        endAt: new Date("2030-01-01T11:00:00Z"),
        status: "BOOKED",
      },
    };

    function reschedule(slotId: string) {
      return rescheduleAppointment(
        new Request("http://localhost/api/appointments/appt-2/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeSlotId: slotId }),
        }),
        { params: Promise.resolve({ id: "appt-2" }) },
      );
    }

    it("returns 403 when a professional moves an appointment into another professional's agenda", async () => {
      mockRequireSession.mockResolvedValue({ user: { id: "pro-user-1", role: "PROFESIONAL" } });
      mockPrisma.appointment.findFirst.mockResolvedValue(baseAppointment);
      mockPrisma.timeSlot.findUnique.mockResolvedValue({
        id: "44444444-4444-4444-8444-444444444444",
        professionalId: "prof-OTHER",
        startAt: new Date("2030-01-03T10:00:00Z"),
        endAt: new Date("2030-01-03T11:00:00Z"),
        status: "AVAILABLE",
      });

      const response = await reschedule("44444444-4444-4444-8444-444444444444");

      expect(response.status).toBe(403);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects a patient rescheduling into a slot inside the 2h lead time", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2029-12-01T10:00:00Z"));
      try {
        mockRequireSession.mockResolvedValue({ user: { id: "patient-user-1", role: "PACIENTE" } });
        mockPrisma.appointment.findFirst.mockResolvedValue(baseAppointment);
        mockPrisma.timeSlot.findUnique.mockResolvedValue({
          id: "55555555-5555-4555-8555-555555555555",
          professionalId: "prof-1",
          startAt: new Date("2029-12-01T11:30:00Z"),
          endAt: new Date("2029-12-01T12:00:00Z"),
          status: "AVAILABLE",
        });

        const response = await reschedule("55555555-5555-4555-8555-555555555555");
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.error).toMatch(/2 horas de anticipación/);
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("refuses to reschedule a cancelled appointment (its slot was released)", async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({ ...baseAppointment, status: "CANCELLED" });

      const response = await reschedule("44444444-4444-4444-8444-444444444444");

      expect(response.status).toBe(409);
      expect(mockPrisma.timeSlot.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
