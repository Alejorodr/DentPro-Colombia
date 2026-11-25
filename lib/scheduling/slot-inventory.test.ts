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
  it("keeps unchanged slots, removes only stale unbooked ones and uses duplicate-safe inserts", async () => {
    // Horario lunes 9:00–11:00 en Bogotá (UTC-5) → slots de 30 min de 14:00Z a 16:00Z.
    const existing = [
      { id: "keep-1", startAt: new Date("2026-03-30T14:00:00.000Z"), endAt: new Date("2026-03-30T14:30:00.000Z") },
      { id: "stale-1", startAt: new Date("2026-03-30T18:00:00.000Z"), endAt: new Date("2026-03-30T18:30:00.000Z") },
      { id: "stale-2", startAt: new Date("2026-03-30T14:00:00.000Z"), endAt: new Date("2026-03-30T14:45:00.000Z") },
    ];
    const tx = {
      timeSlot: {
        findMany: vi.fn().mockResolvedValue(existing),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
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

    expect(result).toMatchObject({ removed: 2, created: 4, skipped: false });
    expect(tx.timeSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "AVAILABLE", appointments: { none: {} } }),
      }),
    );
    // DOG-39: el slot que sigue en el inventario conserva su ID; solo se borran los obsoletos.
    expect(tx.timeSlot.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["stale-1", "stale-2"] }, status: "AVAILABLE", appointments: { none: {} } },
    });
    expect(tx.timeSlot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
      }),
    );
  });

  it("does not delete anything when the inventory is unchanged", async () => {
    const existing = ["14:00", "14:30", "15:00", "15:30"].map((time, index) => {
      const startAt = new Date(`2026-03-30T${time}:00.000Z`);
      return { id: `slot-${index}`, startAt, endAt: new Date(startAt.getTime() + 30 * 60_000) };
    });
    const tx = {
      timeSlot: {
        findMany: vi.fn().mockResolvedValue(existing),
        deleteMany: vi.fn(),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
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

    const result = await refreshFutureInventoryForProfessional({
      professionalId: "prof-1",
      rangeStart: new Date("2026-03-30T05:00:00.000Z"),
      rangeEnd: new Date("2026-03-31T05:00:00.000Z"),
      now: new Date("2026-03-29T05:00:00.000Z"),
      prisma: prismaMock,
    });

    expect(result).toMatchObject({ removed: 0, created: 0 });
    expect(tx.timeSlot.deleteMany).not.toHaveBeenCalled();
  });
});
