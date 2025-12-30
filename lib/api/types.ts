export interface AppointmentRequestPayload {
  name: string;
  phone: string;
  email?: string;
  service: string;
  message?: string;
  preferredDate?: string;
  patientId?: string;
  specialistId?: string;
  scheduleId?: string;
}

export const APPOINTMENT_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface AppointmentSummary {
  id: string;
  patientId: string;
  patientName?: string;
  specialistId: string;
  specialistName?: string;
  scheduleId?: string;
  preferredDate?: string;
  service: string;
  scheduledAt: string;
  status: AppointmentStatus;
}

export interface ScheduleSlot {
  id: string;
  specialistId: string;
  specialistName?: string;
  start: string;
  end: string;
  available: boolean;
}

export interface PatientSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
}
