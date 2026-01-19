import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createAppointment } from "@/app/api/appointments/route";
import { sendEmail } from "@/lib/email";

const mockRequireSession = vi.fn();
const mockEnforceRateLimit = vi.fn();
const mockCreateReceptionNotifications = vi.fn();

const mockTransportSend = vi.fn();
const mockCreateTransport = vi.fn(() => ({ sendMail: mockTransportSend }));

const mockPrisma = {
  timeSlot: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  service: {
    findUnique: vi.fn(),
  },
  appointment: {
    create: vi.fn(),
  },
  notificationPreference: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
  requireRole: () => null,
}));

vi.mock("@/app/api/_utils/ratelimit", () => ({
  enforceRateLimit: () => mockEnforceRateLimit(),
}));

vi.mock("@/lib/notifications", () => ({
  createReceptionNotifications: () => mockCreateReceptionNotifications(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => mockCreateTransport(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "user";
  process.env.SMTP_PASS = "pass";
  process.env.EMAIL_FROM = "DentPro <no-reply@dentpro.test>";
  mockPrisma.timeSlot.findMany.mockResolvedValue([]);
});

describe("appointment email notifications", () => {
  it("sends a confirmation email when creating an appointment", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMINISTRADOR" } });
    mockEnforceRateLimit.mockResolvedValue(null);

    const timeSlot = {
      id: "11111111-1111-4111-8111-111111111111",
      professionalId: "22222222-2222-4222-8222-222222222222",
      startAt: new Date("2030-01-01T14:00:00Z"),
      endAt: new Date("2030-01-01T15:00:00Z"),
      status: "AVAILABLE",
    };

    const appointment = {
      id: "33333333-3333-4333-8333-333333333333",
      patientId: "44444444-4444-4444-8444-444444444444",
      professionalId: "22222222-2222-4222-8222-222222222222",
      timeSlotId: "11111111-1111-4111-8111-111111111111",
      serviceId: "55555555-5555-4555-8555-555555555555",
      reason: "Control",
      status: "PENDING",
      patient: { user: { id: "user-patient", email: "patient@example.com", name: "Ana", lastName: "Lopez", role: "PACIENTE" } },
      professional: { user: { id: "user-prof", email: "prof@example.com", name: "Luis", lastName: "Perez", role: "PROFESIONAL" } },
      timeSlot,
      service: { name: "Limpieza" },
    };

    mockPrisma.timeSlot.findUnique.mockResolvedValue(timeSlot);
    mockPrisma.service.findUnique.mockResolvedValue({ id: "55555555-5555-4555-8555-555555555555", active: true, name: "Limpieza", priceCents: 10000 });
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<typeof appointment>) => {
      mockPrisma.timeSlot.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.appointment.create.mockResolvedValue(appointment);
      return callback(mockPrisma);
    });

    const request = new Request("http://localhost/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: "44444444-4444-4444-8444-444444444444",
        timeSlotId: "11111111-1111-4111-8111-111111111111",
        serviceId: "55555555-5555-4555-8555-555555555555",
        reason: "Control",
      }),
    });

    const response = await createAppointment(request);
    expect(response.status).toBe(201);
    expect(mockTransportSend).toHaveBeenCalled();
  });

  it("does not send email when preference is disabled", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMINISTRADOR" } });
    mockEnforceRateLimit.mockResolvedValue(null);

    const timeSlot = {
      id: "66666666-6666-4666-8666-666666666666",
      professionalId: "77777777-7777-4777-8777-777777777777",
      startAt: new Date("2030-02-01T14:00:00Z"),
      endAt: new Date("2030-02-01T15:00:00Z"),
      status: "AVAILABLE",
    };

    const appointment = {
      id: "88888888-8888-4888-8888-888888888888",
      patientId: "99999999-9999-4999-8999-999999999999",
      professionalId: "77777777-7777-4777-8777-777777777777",
      timeSlotId: "66666666-6666-4666-8666-666666666666",
      serviceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      reason: "Control",
      status: "PENDING",
      patient: { user: { id: "user-patient-2", email: "patient2@example.com", name: "Ana", lastName: "Lopez", role: "PACIENTE" } },
      professional: { user: { id: "user-prof-2", email: "prof2@example.com", name: "Luis", lastName: "Perez", role: "PROFESIONAL" } },
      timeSlot,
      service: { name: "Control" },
    };

    mockPrisma.timeSlot.findUnique.mockResolvedValue(timeSlot);
    mockPrisma.service.findUnique.mockResolvedValue({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", active: true, name: "Control", priceCents: 10000 });
    mockPrisma.notificationPreference.findUnique.mockResolvedValue({ emailEnabled: false });
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<typeof appointment>) => {
      mockPrisma.timeSlot.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.appointment.create.mockResolvedValue(appointment);
      return callback(mockPrisma);
    });

    const request = new Request("http://localhost/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: "99999999-9999-4999-8999-999999999999",
        timeSlotId: "66666666-6666-4666-8666-666666666666",
        serviceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        reason: "Control",
      }),
    });

    const response = await createAppointment(request);
    expect(response.status).toBe(201);
    expect(mockTransportSend).not.toHaveBeenCalled();
  });

  it("skips sending when SMTP is not configured", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Prueba",
      html: "<p>Hola</p>",
    });

    expect(result.skipped).toBe(true);
    expect(result.sent).toBe(false);
  });
});
