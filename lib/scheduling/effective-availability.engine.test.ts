import { describe, expect, it, vi, beforeEach } from "vitest";
import { TimeSlotStatus } from "@prisma/client";

import { getEffectiveAvailability } from "@/lib/scheduling/effective-availability";

const prismaMock = {
  service: { findUnique: vi.fn() },
  professionalService: { findMany: vi.fn() },
  clinicHoliday: { findMany: vi.fn() },
  professionalWorkingSchedule: { findMany: vi.fn() },
  professionalUnavailability: { findMany: vi.fn() },
  appointment: { findMany: vi.fn() },
  timeSlot: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => prismaMock,
}));

describe("getEffectiveAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.service.findUnique.mockResolvedValue({ id: "svc-1", active: true, durationMinutes: 30 });
    prismaMock.professionalService.findMany.mockResolvedValue([
      { professionalId: "prof-1", appointmentDurationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
    ]);
    prismaMock.clinicHoliday.findMany.mockResolvedValue([]);
    prismaMock.professionalWorkingSchedule.findMany.mockResolvedValue([
      { professionalId: "prof-1", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    ]);
    prismaMock.professionalUnavailability.findMany.mockResolvedValue([]);
    prismaMock.appointment.findMany.mockResolvedValue([]);
    prismaMock.timeSlot.findMany
      .mockResolvedValueOnce([
        {
          id: "slot-1",
          professionalId: "prof-1",
          startAt: new Date("2026-03-30T14:00:00.000Z"),
          endAt: new Date("2026-03-30T14:30:00.000Z"),
          status: TimeSlotStatus.AVAILABLE,
          professional: { id: "prof-1", user: { name: "Ana", lastName: "Diaz" }, specialty: { name: "Ortho" } },
        },
      ])
      .mockResolvedValue([]);
  });

  it("keeps slot available when assignment + schedule are valid", async () => {
    const result = await getEffectiveAvailability({
      dateStart: new Date("2026-03-30T05:00:00.000Z"),
      dateEnd: new Date("2026-03-31T05:00:00.000Z"),
      serviceId: "svc-1",
      includeReasons: true,
    });

    expect(result.slots).toHaveLength(1);
    expect(result.reasons?.size).toBe(0);
  });

  it("blocks slot when holiday overlaps date", async () => {
    prismaMock.clinicHoliday.findMany.mockResolvedValue([{ date: new Date("2026-03-30T05:00:00.000Z"), name: "Holiday" }]);

    const result = await getEffectiveAvailability({
      dateStart: new Date("2026-03-30T05:00:00.000Z"),
      dateEnd: new Date("2026-03-31T05:00:00.000Z"),
      serviceId: "svc-1",
      includeReasons: true,
    });

    expect(result.slots).toHaveLength(0);
    expect(result.reasons?.get("slot-1")).toContain("CLINIC_HOLIDAY");
  });

  it("blocks slot when full day unavailability overlaps", async () => {
    prismaMock.professionalUnavailability.findMany.mockResolvedValue([
      {
        professionalId: "prof-1",
        startsAt: new Date("2026-03-30T00:00:00.000Z"),
        endsAt: new Date("2026-03-30T23:59:00.000Z"),
      },
    ]);

    const result = await getEffectiveAvailability({
      dateStart: new Date("2026-03-30T05:00:00.000Z"),
      dateEnd: new Date("2026-03-31T05:00:00.000Z"),
      serviceId: "svc-1",
      includeReasons: true,
    });

    expect(result.slots).toHaveLength(0);
    expect(result.reasons?.get("slot-1")).toContain("OVERLAPS_APPOINTMENT");
  });

  it("blocks slot when appointment already consumes interval", async () => {
    prismaMock.appointment.findMany.mockResolvedValue([
      {
        professionalId: "prof-1",
        timeSlot: {
          startAt: new Date("2026-03-30T14:10:00.000Z"),
          endAt: new Date("2026-03-30T14:40:00.000Z"),
        },
      },
    ]);

    const result = await getEffectiveAvailability({
      dateStart: new Date("2026-03-30T05:00:00.000Z"),
      dateEnd: new Date("2026-03-31T05:00:00.000Z"),
      serviceId: "svc-1",
      includeReasons: true,
    });

    expect(result.slots).toHaveLength(0);
    expect(result.reasons?.get("slot-1")).toContain("OVERLAPS_APPOINTMENT");
  });
});
