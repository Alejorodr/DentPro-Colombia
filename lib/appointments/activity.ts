import { AppointmentStatus } from "@prisma/client";

const statusLabelMap: Record<AppointmentStatus, string> = {
  SCHEDULED: "programada",
  CONFIRMED: "confirmada",
  CHECKED_IN: "en sala",
  CANCELLED: "cancelada",
  COMPLETED: "completada",
  NO_SHOW: "no asistió",
};

export function appointmentStatusPastLabel(status: AppointmentStatus): string {
  return statusLabelMap[status] ?? "actualizada";
}

export function getAppointmentEventLabel(action: string, status?: AppointmentStatus | null): string {
  if (action === "created") return "Cita creada";
  if (action === "rescheduled") return "Cita reprogramada";
  if (action === "checked_in") return "Paciente en sala";
  if (action === "marked_no_show") return "Paciente no asistió";
  if (action === "cancelled") return "Cita cancelada";
  if (action === "status_updated" && status) {
    return `Estado cambiado a ${appointmentStatusPastLabel(status)}`;
  }
  return "Cambio de cita";
}

export function buildAppointmentStatusNotification(status: AppointmentStatus) {
  if (status === AppointmentStatus.CANCELLED) {
    return {
      type: "appointment_cancelled",
      title: "Cita cancelada",
      activity: "Tu cita fue cancelada.",
    };
  }

  if (status === AppointmentStatus.CONFIRMED) {
    return {
      type: "appointment_confirmed",
      title: "Cita confirmada",
      activity: "Tu cita fue confirmada.",
    };
  }

  if (status === AppointmentStatus.CHECKED_IN) {
    return {
      type: "appointment_checked_in",
      title: "Paciente en sala",
      activity: "El paciente realizó check-in.",
    };
  }

  if (status === AppointmentStatus.COMPLETED) {
    return {
      type: "appointment_completed",
      title: "Cita completada",
      activity: "La cita fue completada.",
    };
  }

  if (status === AppointmentStatus.NO_SHOW) {
    return {
      type: "appointment_no_show",
      title: "Paciente no asistió",
      activity: "La cita fue marcada como no-show.",
    };
  }

  return {
    type: "appointment_status",
    title: "Estado de cita actualizado",
    activity: `La cita fue ${appointmentStatusPastLabel(status)}.`,
  };
}
