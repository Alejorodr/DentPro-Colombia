import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppointmentStatus } from "@/lib/api/types";

const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
}));

vi.mock("@/lib/authz", async () => {
  const actual = await vi.importActual<typeof import("@/lib/authz")>("@/lib/authz");
  return {
    ...actual,
    requireSession: requireSessionMock,
  };
});

import { PATCH } from "../[id]/status/route";
import { fromPrismaStatus, toPrismaStatus } from "../utils";

// Prisma always returns its own uppercase enum (SCHEDULED/CONFIRMED/CANCELLED…),
// never the app-level lowercase AppointmentStatus — mirror that boundary here so
// the mock round-trips through toPrismaStatus/fromPrismaStatus exactly like the
// real client would.
type AppointmentRecord = {
  id: string;
  serviceName: string;
  createdAt: Date;
  status: string;
  patientId: string | null;
  professionalId: string | null;
  timeSlotId: string | null;
};

const mockAppointments = new Map<string, AppointmentRecord>();
const PENDING_STATUS: AppointmentStatus = "pending";
const CONFIRMED_STATUS: AppointmentStatus = "confirmed";
const CANCELLED_STATUS: AppointmentStatus = "cancelled";

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    appointment: {
      create: vi.fn(async ({ data }: { data: Omit<AppointmentRecord, "id"> & { id?: string } }) => {
        const record: AppointmentRecord = {
          id: data.id ?? randomUUID(),
          patientId: data.patientId ?? null,
          professionalId: data.professionalId ?? null,
          timeSlotId: data.timeSlotId ?? null,
          serviceName: data.serviceName,
          createdAt: data.createdAt,
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
    professionalId: null,
    timeSlotId: null,
    serviceName: `test-status-${randomUUID()}`,
    createdAt: new Date(),
    status: toPrismaStatus(initialStatus),
  };

  mockAppointments.set(record.id, record);
  return record;
}

describe("PATCH /api/appointments/[id]/status", () => {
  beforeEach(() => {
    mockAppointments.clear();
    requireSessionMock.mockResolvedValue({
      user: { id: "receptionist-1", role: "RECEPCIONISTA" },
    });
  });

  it("updates a pending appointment to confirmed", async () => {
    const appointment = await createAppointment(PENDING_STATUS);

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

    const storedStatus = mockAppointments.get(appointment.id)?.status;
    expect(storedStatus && fromPrismaStatus(storedStatus)).toBe(CONFIRMED_STATUS);
  });

  it("rejects transitions from cancelled to other states", async () => {
    const appointment = await createAppointment(CANCELLED_STATUS);

    const response = await PATCH(
      new Request(`http://localhost/api/appointments/${appointment.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed" }),
      }),
      { params: { id: appointment.id } },
    );

    expect(response.status).toBe(400);

    const storedStatus = mockAppointments.get(appointment.id)?.status;
    expect(storedStatus && fromPrismaStatus(storedStatus)).toBe(CANCELLED_STATUS);
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
