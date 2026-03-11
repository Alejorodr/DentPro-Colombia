import { describe, expect, it, vi } from "vitest";
import { AppointmentStatus, Role } from "@prisma/client";

import { recordAppointmentEvent } from "@/lib/appointments/events";

describe("recordAppointmentEvent", () => {
  it("persists status transition and metadata", async () => {
    const create = vi.fn().mockResolvedValue({ id: "evt-1" });
    const prisma = { appointmentEvent: { create } } as any;

    await recordAppointmentEvent(
      {
        appointmentId: "apt-1",
        action: "rescheduled",
        actorUserId: "user-1",
        actorRole: Role.RECEPCIONISTA,
        previousStatus: AppointmentStatus.SCHEDULED,
        newStatus: AppointmentStatus.CONFIRMED,
        metadata: { previousSlotId: "slot-a", newSlotId: "slot-b" },
      },
      prisma,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          appointmentId: "apt-1",
          action: "rescheduled",
          previousStatus: AppointmentStatus.SCHEDULED,
          newStatus: AppointmentStatus.CONFIRMED,
        }),
      }),
    );
  });
});
