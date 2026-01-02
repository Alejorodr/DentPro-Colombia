import { randomUUID } from "node:crypto";

import { AppointmentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "../[id]/status/route";

type AppointmentRecord = {
  id: string;
  service: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  patientId: string | null;
  specialistId: string | null;
  scheduleId: string | null;
  preferredDate: Date | null;
};

const mockAppointments = new Map<string, AppointmentRecord>();

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({
    user: { role: "admin" },
  })),
}));

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    appointment: {
      create: vi.fn(async ({ data }: { data: Omit<AppointmentRecord, "id"> & { id?: string } }) => {
        const record: AppointmentRecord = {
          id: data.id ?? randomUUID(),
          patientId: data.patientId ?? null,
          specialistId: data.specialistId ?? null,
          scheduleId: data.scheduleId ?? null,
          preferredDate: data.preferredDate ?? null,
          service: data.service,
          scheduledAt: data.scheduledAt,
          status: data.status,
        };

        mockAppointments.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        return mockAppointments.get(id) ?? null;
      }),
      update: vi.fn(async ({ where: { id }, data }: { where: { id: string }; data: Partial<AppointmentRecord> }) => {
        const existing = mockAppointments.get(id);
        if (!existing) {
          throw new Error("Appointment not found");
        }

        const updated = { ...existing, ...data } satisfies AppointmentRecord;
        mockAppointments.set(id, updated);
        return updated;
      }),
    },
  };

  return { getPrismaClient: () => prismaMock };
});

async function createAppointment(initialStatus: AppointmentStatus) {
  const record: AppointmentRecord = {
    id: randomUUID(),
    patientId: null,
    specialistId: null,
    scheduleId: null,
    preferredDate: null,
    service: `test-status-${randomUUID()}`,
    scheduledAt: new Date(),
    status: initialStatus,
  };

  mockAppointments.set(record.id, record);
  return record;
}

describe("PATCH /api/appointments/[id]/status", () => {
  beforeEach(() => {
    mockAppointments.clear();
  });

  it("updates a pending appointment to confirmed", async () => {
    const appointment = await createAppointment(AppointmentStatus.pending);

    const response = await PATCH(
      new Request(`http://localhost/api/appointments/${appointment.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      }),
      { params: { id: appointment.id } },
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as { status: string };
    expect(payload.status).toBe("confirmed");

    expect(mockAppointments.get(appointment.id)?.status).toBe(AppointmentStatus.confirmed);
  });

  it("rejects transitions from cancelled to other states", async () => {
    const appointment = await createAppointment(AppointmentStatus.cancelled);

    const response = await PATCH(
      new Request(`http://localhost/api/appointments/${appointment.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      }),
      { params: { id: appointment.id } },
    );

    expect(response.status).toBe(400);

    expect(mockAppointments.get(appointment.id)?.status).toBe(AppointmentStatus.cancelled);
  });

  it("returns 404 when appointment does not exist", async () => {
    const missingId = randomUUID();
    const response = await PATCH(
      new Request(`http://localhost/api/appointments/${missingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }),
      { params: { id: missingId } },
    );

    expect(response.status).toBe(404);
  });
});
