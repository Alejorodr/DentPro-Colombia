import { describe, expect, it } from "vitest";
import { TimeSlotStatus } from "@prisma/client";

import { evaluateEffectiveSlot } from "@/lib/scheduling/effective-availability";

describe("evaluateEffectiveSlot", () => {
  it("returns service assignment reason when professional is not assigned", () => {
    const reasons = evaluateEffectiveSlot({
      slot: {
        id: "slot-1",
        professionalId: "prof-1",
        startAt: new Date("2026-03-30T14:00:00.000Z"),
        endAt: new Date("2026-03-30T14:30:00.000Z"),
        status: TimeSlotStatus.AVAILABLE,
      },
      holiday: false,
      serviceId: "service-1",
      allowedProfessionalIds: new Set(["prof-2"]),
      schedules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }],
      blocks: [],
    });

    expect(reasons).toContain("SERVICE_NOT_ASSIGNED");
  });

  it("returns unavailable reason when slot overlaps professional block", () => {
    const reasons = evaluateEffectiveSlot({
      slot: {
        id: "slot-2",
        professionalId: "prof-1",
        startAt: new Date("2026-03-30T14:00:00.000Z"),
        endAt: new Date("2026-03-30T14:30:00.000Z"),
        status: TimeSlotStatus.AVAILABLE,
      },
      holiday: false,
      serviceId: "service-1",
      allowedProfessionalIds: new Set(["prof-1"]),
      schedules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }],
      blocks: [{ startsAt: new Date("2026-03-30T13:55:00.000Z"), endsAt: new Date("2026-03-30T14:10:00.000Z") }],
    });

    expect(reasons).toContain("PROFESSIONAL_UNAVAILABLE");
  });
});
