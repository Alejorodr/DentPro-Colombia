import { describe, expect, it, vi } from "vitest";

import { buildSlotsFromIntervals, refreshFutureInventoryForProfessional } from "@/lib/scheduling/slot-inventory";

describe("buildSlotsFromIntervals", () => {
  it("materializes deterministic slots for the same interval", () => {
    const interval = {
      startAt: new Date("2026-03-30T14:00:00.000Z"),
      endAt: new Date("2026-03-30T15:00:00.000Z"),
    };

    const first = buildSlotsFromIntervals([interval], 30);
    const second = buildSlotsFromIntervals([interval], 30);

    expect(first).toHaveLength(2);
    expect(second).toEqual(first);
  });
});

describe("refreshFutureInventoryForProfessional", () => {
  it("rebuilds only future unbooked inventory and uses duplicate-safe inserts", async () => {
    const tx = {
      timeSlot: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        createMany: vi.fn().mockResolvedValue({ count: 4 }),
      },
    };

    const prismaMock = {
      professionalProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "prof-1",
          active: true,
          slotDurationMinutes: 30,
          specialty: { defaultSlotDurationMinutes: 30 },
        }),
      },
      professionalWorkingSchedule: {
        findMany: vi.fn().mockResolvedValue([{ id: "sched-1", dayOfWeek: 1, startTime: "09:00", endTime: "11:00", effectiveFrom: null, effectiveTo: null }]),
      },
      professionalScheduleAdjustment: { findMany: vi.fn().mockResolvedValue([]) },
      professionalService: { findMany: vi.fn().mockResolvedValue([{ appointmentDurationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, service: { durationMinutes: 30 } }]) },
      professionalUnavailability: { findMany: vi.fn().mockResolvedValue([]) },
      appointment: { findMany: vi.fn().mockResolvedValue([]) },
      clinicHoliday: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (cb: (trx: typeof tx) => unknown) => cb(tx)),
    } as any;

    const start = new Date("2026-03-30T05:00:00.000Z");
    const end = new Date("2026-03-31T05:00:00.000Z");

    const result = await refreshFutureInventoryForProfessional({
      professionalId: "prof-1",
      rangeStart: start,
      rangeEnd: end,
      now: new Date("2026-03-29T05:00:00.000Z"),
      prisma: prismaMock,
    });

    expect(result).toMatchObject({ removed: 3, created: 4, skipped: false });
    expect(tx.timeSlot.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "AVAILABLE",
          appointment: null,
        }),
      }),
    );
    expect(tx.timeSlot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
      }),
    );
  });
});
