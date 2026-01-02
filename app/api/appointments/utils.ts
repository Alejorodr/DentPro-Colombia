import { NextResponse } from "next/server";

import { APPOINTMENT_STATUSES, type AppointmentStatus, type AppointmentSummary } from "@/lib/api/types";

export function toAppointmentSummary(record: {
  id: string;
  patientId: string | null;
  specialistId: string | null;
  scheduleId: string | null;
  service: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  preferredDate: Date | null;
  patient?: { name?: string | null } | null;
  specialist?: { id?: string; name?: string | null } | null;
  schedule?: { specialist?: { id?: string; name?: string | null } | null } | null;
}): AppointmentSummary {
  const specialistSource = record.schedule?.specialist ?? record.specialist ?? null;

  return {
    id: record.id,
    patientId: record.patientId ?? "unassigned",
    patientName: record.patient?.name ?? undefined,
    specialistId: record.specialistId ?? specialistSource?.id ?? "unassigned",
    specialistName: specialistSource?.name ?? undefined,
    scheduleId: record.scheduleId ?? undefined,
    preferredDate: record.preferredDate?.toISOString(),
    service: record.service,
    scheduledAt: record.scheduledAt.toISOString(),
    status: record.status,
  };
}

export function buildError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function isValidAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}
