import { AppointmentStatus } from "@prisma/client";

export type OperationalAppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type AppointmentWithOperationalSignals = {
  status: AppointmentStatus;
};

export function toOperationalStatus(
  appointment: AppointmentWithOperationalSignals,
): OperationalAppointmentStatus {
  return appointment.status as OperationalAppointmentStatus;
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

export const REMINDABLE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];
