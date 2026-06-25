import { NextResponse } from "next/server";
import type { AppointmentStatus as PrismaAppointmentStatus } from "@prisma/client";

import { APPOINTMENT_STATUSES, type AppointmentStatus, type AppointmentSummary } from "@/lib/api/types";

// Prisma stores uppercase (SCHEDULED/CONFIRMED/CANCELLED…), API exposes lowercase (pending/confirmed/cancelled).
const FROM_PRISMA: Record<string, AppointmentStatus> = {
  SCHEDULED: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "confirmed",
  NO_SHOW: "cancelled",
};

const TO_PRISMA: Record<AppointmentStatus, PrismaAppointmentStatus> = {
  pending: "SCHEDULED",
  confirmed: "CONFIRMED",
  cancelled: "CANCELLED",
};

export function fromPrismaStatus(prismaStatus: string): AppointmentStatus {
  return FROM_PRISMA[prismaStatus] ?? "pending";
}

export function toPrismaStatus(status: AppointmentStatus): PrismaAppointmentStatus {
  return TO_PRISMA[status];
}

export function toAppointmentSummary(record: {
  id: string;
  patientId: string | null;
  specialistId: string | null;
  scheduleId: string | null;
  service: string;
  scheduledAt: Date;
  status: AppointmentStatus | string;
  preferredDate: Date | null;
  patient?: { name?: string | null } | null;
  specialist?: { id?: string; name?: string | null } | null;
  schedule?: { specialist?: { id?: string; name?: string | null } | null } | null;
}): AppointmentSummary {
  const specialistSource = record.schedule?.specialist ?? record.specialist ?? null;
  const status: AppointmentStatus = isValidAppointmentStatus(record.status)
    ? record.status
    : fromPrismaStatus(record.status);

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
    status,
  };
}

export function buildError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function isValidAppointmentStatus(value: string): value is AppointmentStatus {
  return (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}
