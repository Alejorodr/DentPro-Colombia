import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createAppointment } from "@/app/api/appointments/route";
import { DELETE as cancelAppointment, PATCH as updateAppointment } from "@/app/api/appointments/[id]/route";
import { POST as createClientAppointment } from "@/app/api/client/appointments/route";
import {
  ACTIVE_CAP_MESSAGE,
  LEAD_TIME_MESSAGE,
  PAST_SLOT_MESSAGE,
  checkSlotLeadTime,
} from "@/lib/appointments/booking-limits";

const { mockRequireSession, mockPrisma } = vi.hoisted(() => {
  const prisma = {
    timeSlot: { findUnique: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    service: { findUnique: vi.fn() },
    patientProfile: { findUnique: vi.fn() },
    user: { update: vi.fn() },
    appointment: { create: vi.fn(), count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return { mockRequireSession: vi.fn(), mockPrisma: prisma };
});

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
  requireRole: () => null,
}));
vi.mock("@/app/api/_utils/ratelimit", () => ({ enforceRateLimit: async () => null }));
vi.mock("@/lib/notifications", () => ({ createReceptionNotifications: vi.fn() }));
vi.mock("@/lib/notifications/email", () => ({ sendAppointmentEmail: vi.fn() }));
vi.mock("@/lib/appointments/events", () => ({ recordAppointmentEvent: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/lib/scheduling/effective-availability", () => ({
  assertSlotBookable: async () => ({ ok: true }),
}));
vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
  isDatabaseUnavailableError: () => false,
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const NOW = new Date("2030-01-01T12:00:00Z");
const PATIENT_PROFILE_ID = "44444444-4444-4444-8444-444444444444";
const PROFESSIONAL_ID = "22222222-2222-4222-8222-222222222222";
const SLOT_ID = "11111111-1111-4111-8111-111111111111";
const SERVICE_ID = "55555555-5555-4555-8555-555555555555";

function slotStartingIn(minutes: number) {
  const startAt = new Date(NOW.getTime() + minutes * 60_000);
  return {
    id: SLOT_ID,
    professionalId: PROFESSIONAL_ID,
    startAt,
    endAt: new Date(startAt.getTime() + 30 * 60_000),
    status: "AVAILABLE",
  };
}

function postAppointment(body: Record<string, unknown> = {}) {
  return createAppointment(
    new Request("http://localhost/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSlotId: SLOT_ID, serviceId: SERVICE_ID, reason: "Control", ...body }),
    }),
  );
}

function postClientAppointment() {
  return createClientAppointment(
    new Request("http://localhost/api/client/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: SLOT_ID, serviceId: SERVICE_ID }),
    }),
  );
}

function asPatient() {
  mockRequireSession.mockResolvedValue({ user: { id: "user-patient", role: "PACIENTE" } });
}

function asReceptionist() {
  mockRequireSession.mockResolvedValue({ user: { id: "user-rec", role: "RECEPCIONISTA" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);

  process.env.APPOINTMENT_BUFFER_MINUTES = "0";
  mockPrisma.timeSlot.findUnique.mockResolvedValue(slotStartingIn(24 * 60));
  mockPrisma.timeSlot.findMany.mockResolvedValue([]);
  mockPrisma.timeSlot.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.service.findUnique.mockResolvedValue({ id: SERVICE_ID, active: true, name: "Limpieza", priceCents: 10000 });
  mockPrisma.patientProfile.findUnique.mockResolvedValue({
    id: PATIENT_PROFILE_ID,
    userId: "user-patient",
    user: { id: "user-patient", name: "Ana", lastName: "Lopez" },
  });
  mockPrisma.appointment.count.mockResolvedValue(0);
  mockPrisma.appointment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "appt-new",
    ...data,
    patient: { user: { name: "Ana", lastName: "Lopez" } },
  }));
  mockPrisma.$queryRaw.mockResolvedValue([{ id: PATIENT_PROFILE_ID }]);
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
    callback(mockPrisma),
  );
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.APPOINTMENT_BUFFER_MINUTES;
});

describe("checkSlotLeadTime", () => {
  it("requires 2h lead time for patients and only a future slot for staff", () => {
    const in2h = new Date(NOW.getTime() + 120 * 60_000);
    const in2h1m = new Date(NOW.getTime() + 121 * 60_000);
    const past = new Date(NOW.getTime() - 60_000);

    expect(checkSlotLeadTime(in2h, "PACIENTE", NOW)?.message).toBe(LEAD_TIME_MESSAGE);
    expect(checkSlotLeadTime(in2h1m, "PACIENTE", NOW)).toBeNull();
    expect(checkSlotLeadTime(new Date(NOW.getTime() + 60_000), "RECEPCIONISTA", NOW)).toBeNull();
    expect(checkSlotLeadTime(NOW, "ADMINISTRADOR", NOW)?.message).toBe(PAST_SLOT_MESSAGE);
    expect(checkSlotLeadTime(past, "RECEPCIONISTA", NOW)?.status).toBe(422);
  });
});

describe("POST /api/appointments booking limits", () => {
  it("rejects a patient booking inside the 2h lead time with 422", async () => {
    asPatient();
    mockPrisma.timeSlot.findUnique.mockResolvedValue(slotStartingIn(90));

    const response = await postAppointment();

    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe(LEAD_TIME_MESSAGE);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects staff booking a slot that already started", async () => {
    asReceptionist();
    mockPrisma.timeSlot.findUnique.mockResolvedValue(slotStartingIn(-30));

    const response = await postAppointment({ patientId: PATIENT_PROFILE_ID });

    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe(PAST_SLOT_MESSAGE);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a patient that already has 3 active future appointments", async () => {
    asPatient();
    mockPrisma.appointment.count.mockResolvedValue(3);

    const response = await postAppointment();

    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe(ACTIVE_CAP_MESSAGE);
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockPrisma.appointment.count).toHaveBeenCalledWith({
      where: {
        patientId: PATIENT_PROFILE_ID,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        timeSlot: { startAt: { gt: NOW } },
      },
    });
    expect(mockPrisma.timeSlot.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it("lets a patient under the cap book", async () => {
    asPatient();
    mockPrisma.appointment.count.mockResolvedValue(2);

    const response = await postAppointment();

    expect(response.status).toBe(201);
    expect(mockPrisma.appointment.create).toHaveBeenCalledTimes(1);
  });

  it("exempts staff from the active appointment cap", async () => {
    asReceptionist();
    mockPrisma.appointment.count.mockResolvedValue(10);

    const response = await postAppointment({ patientId: PATIENT_PROFILE_ID });

    expect(response.status).toBe(201);
    expect(mockPrisma.appointment.count).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });
});

describe("POST /api/client/appointments booking limits", () => {
  beforeEach(() => {
    asPatient();
  });

  it("rejects a slot inside the 2h lead time", async () => {
    mockPrisma.timeSlot.findUnique.mockResolvedValue(slotStartingIn(60));

    const response = await postClientAppointment();

    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe(LEAD_TIME_MESSAGE);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects when the patient reached the active appointment cap", async () => {
    mockPrisma.appointment.count.mockResolvedValue(3);

    const response = await postClientAppointment();

    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe(ACTIVE_CAP_MESSAGE);
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });

  it("books when under the cap and outside the lead time", async () => {
    mockPrisma.appointment.count.mockResolvedValue(1);

    const response = await postClientAppointment();

    expect(response.status).toBe(201);
  });
});

describe("book → cancel → rebook flow (route level)", () => {
  const mutationResult = {
    id: "appt-1",
    reason: "Control",
    notes: null,
    status: "CANCELLED",
    patient: { id: "p", patientCode: null, user: { name: "Ana", lastName: "Lopez" } },
    professional: { id: "pr", user: { name: "Luis", lastName: "Perez" }, specialty: null },
    timeSlot: { id: SLOT_ID, startAt: new Date("2030-01-02T12:00:00Z"), endAt: new Date("2030-01-02T12:30:00Z") },
    service: { id: SERVICE_ID, name: "Limpieza" },
  };

  function cancel() {
    return cancelAppointment(new Request("http://localhost/api/appointments/appt-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "appt-1" }),
    });
  }

  it("cancelling releases the slot and the same slot can be booked again", async () => {
    asReceptionist();
    mockPrisma.appointment.findFirst.mockResolvedValue({
      id: "appt-1",
      status: "SCHEDULED",
      timeSlot: { startAt: new Date("2030-01-02T12:00:00Z") },
    });
    mockPrisma.appointment.update.mockResolvedValue(mutationResult);

    const cancelResponse = await cancel();
    expect(cancelResponse.status).toBe(200);
    expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CANCELLED", timeSlot: { update: { status: "AVAILABLE" } } },
      }),
    );

    // The slot is AVAILABLE again; the DB no longer counts the cancelled row (partial unique index).
    asPatient();
    const rebook = await postAppointment();
    expect(rebook.status).toBe(201);
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ timeSlotId: SLOT_ID }) }),
    );
  });

  it("refuses to cancel an already cancelled appointment (would free someone else's slot)", async () => {
    asReceptionist();
    mockPrisma.appointment.findFirst.mockResolvedValue({
      id: "appt-1",
      status: "CANCELLED",
      timeSlot: { startAt: new Date("2030-01-02T12:00:00Z") },
    });

    const response = await cancel();

    expect(response.status).toBe(409);
    expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
  });

  it("refuses to reactivate a cancelled appointment via PATCH", async () => {
    asReceptionist();
    mockPrisma.appointment.findFirst.mockResolvedValue({
      id: "appt-1",
      status: "CANCELLED",
      checkedInAt: null,
      timeSlotId: SLOT_ID,
      timeSlot: { startAt: new Date("2030-01-02T12:00:00Z") },
    });

    const response = await updateAppointment(
      new Request("http://localhost/api/appointments/appt-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      }),
      { params: Promise.resolve({ id: "appt-1" }) },
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
  });
});
