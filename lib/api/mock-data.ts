import type { AppointmentRequestPayload, AppointmentSummary, PatientSummary, ScheduleSlot } from "./types";

export const mockAppointments: AppointmentSummary[] = [
  {
    id: "a1",
    patientId: "p1",
    specialistId: "u2",
    service: "Ortodoncia",
    scheduledAt: "2024-08-21T09:00:00-05:00",
    status: "confirmed",
  },
];

export const mockSchedules: ScheduleSlot[] = [
  {
    id: "s1",
    specialistId: "u2",
    start: "2024-08-21T09:00:00-05:00",
    end: "2024-08-21T09:45:00-05:00",
    available: false,
  },
  {
    id: "s2",
    specialistId: "u2",
    start: "2024-08-21T10:00:00-05:00",
    end: "2024-08-21T10:45:00-05:00",
    available: true,
  },
];

export const mockPatients: PatientSummary[] = [
  {
    id: "p1",
    name: "Laura Gómez",
    email: "laura@dentpro.co",
    phone: "+57 310 456 7890",
  },
  {
    id: "p2",
    name: "Carlos Pardo",
    email: "carlos@dentpro.co",
    phone: "+57 301 987 6543",
  },
];

export function appendAppointment(entry: AppointmentSummary) {
  mockAppointments.push(entry);
}

export function createAppointmentFromRequest(
  payload: AppointmentRequestPayload,
  id: string,
): AppointmentSummary {
  return {
    id,
    patientId: payload.patientId ?? "p-temporal",
    specialistId: payload.specialistId ?? "u2",
    service: payload.service,
    scheduledAt: payload.preferredDate ?? new Date().toISOString(),
    status: "pending",
  };
}

