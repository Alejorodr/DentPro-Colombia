import { NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";

import type { AppointmentSummary } from "@/lib/api/types";

export function toAppointmentSummary(record: {
  id: string;
  patientId: string | null;
  specialistId: string | null;
  scheduleId: string | null;
  service: string;
  scheduledAt: Date;
  status: AppointmentStatus;
  preferredDate: Date | null;
}): AppointmentSummary {
  return {
    id: record.id,
    patientId: record.patientId ?? "unassigned",
    specialistId: record.specialistId ?? "unassigned",
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
  return (Object.values(AppointmentStatus) as string[]).includes(value);
}
