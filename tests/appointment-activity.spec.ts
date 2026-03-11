import { describe, expect, it } from "vitest";
import { AppointmentStatus } from "@prisma/client";

import {
  appointmentStatusPastLabel,
  buildAppointmentStatusNotification,
  getAppointmentEventLabel,
} from "@/lib/appointments/activity";
import { operationalStatusLabel } from "@/lib/appointments/status";

describe("appointment activity helpers", () => {
  it("maps event actions to timeline labels", () => {
    expect(getAppointmentEventLabel("created")).toBe("Cita creada");
    expect(getAppointmentEventLabel("rescheduled")).toBe("Cita reprogramada");
    expect(getAppointmentEventLabel("status_updated", AppointmentStatus.CONFIRMED)).toContain("confirmada");
  });

  it("creates actionable notifications by status", () => {
    const cancelled = buildAppointmentStatusNotification(AppointmentStatus.CANCELLED);
    expect(cancelled.type).toBe("appointment_cancelled");
    expect(cancelled.title).toBe("Cita cancelada");

    const noShow = buildAppointmentStatusNotification(AppointmentStatus.NO_SHOW);
    expect(noShow.type).toBe("appointment_no_show");
  });

  it("keeps status labels coherent between portals", () => {
    expect(operationalStatusLabel("CONFIRMED").toLowerCase()).toContain(appointmentStatusPastLabel(AppointmentStatus.CONFIRMED));
    expect(operationalStatusLabel("NO_SHOW").toLowerCase()).toContain("no asistió");
  });
});
