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

export interface AppointmentSummary {
  id: string;
  patientId: string;
  specialistId: string;
  scheduleId?: string;
  preferredDate?: string;
  service: string;
  scheduledAt: string;
  status: "pending" | "confirmed" | "cancelled";
}

export interface ScheduleSlot {
  id: string;
  specialistId: string;
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

