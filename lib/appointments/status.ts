import { AppointmentStatus } from "@prisma/client";

export const NO_SHOW_NOTE_MARKER = "[NO_SHOW]";

export type AppointmentWithOperationalSignals = {
  status: AppointmentStatus;
  checkedInAt?: Date | string | null;
  notes?: string | null;
};

export type OperationalAppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export function isNoShow(notes?: string | null): boolean {
  return notes?.includes(NO_SHOW_NOTE_MARKER) ?? false;
}

export function toOperationalStatus(
  appointment: AppointmentWithOperationalSignals,
): OperationalAppointmentStatus {
  if (appointment.status === AppointmentStatus.CANCELLED) {
    return isNoShow(appointment.notes) ? "NO_SHOW" : "CANCELLED";
  }

  if (appointment.status === AppointmentStatus.COMPLETED) {
    return "COMPLETED";
  }

  if (appointment.checkedInAt) {
    return "CHECKED_IN";
  }

  if (appointment.status === AppointmentStatus.CONFIRMED) {
    return "CONFIRMED";
  }

  return "SCHEDULED";
}

export function operationalStatusLabel(status: OperationalAppointmentStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "Programada";
    case "CONFIRMED":
      return "Confirmada";
    case "CHECKED_IN":
      return "En sala";
    case "COMPLETED":
      return "Atendida";
    case "NO_SHOW":
      return "No asistió";
    case "CANCELLED":
      return "Cancelada";
    default:
      return "Programada";
  }
}

export function normalizeNoShowNotes(notes?: string | null): string {
  const base = notes?.trim() ?? "";
  if (base.includes(NO_SHOW_NOTE_MARKER)) {
    return base;
  }
  return `${NO_SHOW_NOTE_MARKER} ${base}`.trim();
}
