import type { AppointmentStatus, AttachmentKind, PrescriptionItemType } from "@prisma/client";

export interface ProfessionalDashboardAppointment {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  reason: string;
  serviceName?: string | null;
  patient: {
    id: string;
    name: string;
    lastName: string;
    patientCode?: string | null;
  };
}

export interface ProfessionalAppointmentDetail {
  appointment: {
    id: string;
    status: AppointmentStatus;
    reason: string;
    serviceName?: string | null;
    startAt: string;
    endAt: string;
  };
  patient: {
    id: string;
    name: string;
    lastName: string;
    email?: string | null;
    patientCode?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    insuranceProvider?: string | null;
    insuranceStatus?: string | null;
  };
  allergies: Array<{
    id: string;
    substance: string;
    severity: string;
    notes?: string | null;
  }>;
  clinicalNotes: Array<{
    id: string;
    content: string;
    updatedAt: string;
  }>;
  prescription: {
    id: string;
    items: Array<{
      id: string;
      type: PrescriptionItemType;
      name: string;
      dosage?: string | null;
      frequency?: string | null;
      instructions?: string | null;
    }>;
  } | null;
  attachments: Array<{
    id: string;
    kind: AttachmentKind;
    filename: string;
    url?: string | null;
    dataUrl?: string | null;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    startAt: string;
    status: AppointmentStatus;
    reason: string;
  }>;
}
