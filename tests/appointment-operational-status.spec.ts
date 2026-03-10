import { describe, expect, it } from "vitest";
import { AppointmentStatus } from "@prisma/client";

import { NO_SHOW_NOTE_MARKER, normalizeNoShowNotes, toOperationalStatus } from "@/lib/appointments/status";

describe("appointment operational status", () => {
  it("maps checked-in confirmed appointments to CHECKED_IN", () => {
    expect(
      toOperationalStatus({
        status: AppointmentStatus.CONFIRMED,
        checkedInAt: new Date().toISOString(),
      }),
    ).toBe("CHECKED_IN");
  });

  it("maps cancelled with marker to NO_SHOW", () => {
    expect(
      toOperationalStatus({
        status: AppointmentStatus.CANCELLED,
        notes: `${NO_SHOW_NOTE_MARKER} llegó tarde`,
      }),
    ).toBe("NO_SHOW");
  });

  it("normalizes no-show notes adding marker once", () => {
    expect(normalizeNoShowNotes("Paciente ausente")).toContain(NO_SHOW_NOTE_MARKER);
    expect(normalizeNoShowNotes(`${NO_SHOW_NOTE_MARKER} Paciente ausente`)).toBe(
      `${NO_SHOW_NOTE_MARKER} Paciente ausente`,
    );
  });
});
