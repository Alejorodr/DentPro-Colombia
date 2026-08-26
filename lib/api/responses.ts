import type { AppointmentStatus, AppointmentSummary, PatientSummary } from "./types";

export interface PaginatedResponse<T> {
  items?: T[];
  data?: T[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export type CollectionResponse<T> = T[] | PaginatedResponse<T>;

export interface CollectionResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function getCollectionItems<T>(payload: CollectionResponse<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items ?? payload.data ?? [];
}

export function getCollectionResult<T>(payload: CollectionResponse<T>): CollectionResult<T> {
  const items = getCollectionItems(payload);

  if (Array.isArray(payload)) {
    return {
      items,
      page: 1,
      pageSize: items.length,
      total: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    };
  }

  return {
    items,
    page: payload.page ?? 1,
    pageSize: payload.pageSize ?? items.length,
    total: payload.total ?? items.length,
    totalPages: payload.totalPages ?? (items.length > 0 ? 1 : 0),
  };
}

const FROM_PRISMA_STATUS: Record<string, AppointmentStatus> = {
  SCHEDULED: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "confirmed",
  NO_SHOW: "cancelled",
  pending: "pending",
  confirmed: "confirmed",
  cancelled: "cancelled",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toIsoString(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  return undefined;
}

function joinName(user: Record<string, unknown>): string | undefined {
  return [asString(user.name), asString(user.lastName)].filter(Boolean).join(" ").trim() || undefined;
}

export function toLegacyAppointmentSummary(item: unknown): AppointmentSummary {
  const record = asRecord(item);
  const patient = asRecord(record.patient);
  const patientUser = asRecord(patient.user);
  const professional = asRecord(record.professional);
  const professionalUser = asRecord(professional.user);
  const timeSlot = asRecord(record.timeSlot);
  const service = asRecord(record.service);
  const rawStatus = asString(record.status) ?? "pending";

  return {
    id: asString(record.id) ?? "unknown",
    patientId: asString(record.patientId) ?? asString(patient.id) ?? "unassigned",
    patientName: joinName(patientUser),
    specialistId: asString(record.specialistId) ?? asString(record.professionalId) ?? asString(professional.id) ?? "unassigned",
    specialistName: joinName(professionalUser),
    scheduleId: asString(record.scheduleId) ?? asString(record.timeSlotId) ?? asString(timeSlot.id),
    preferredDate: toIsoString(record.preferredDate),
    service: asString(record.serviceName) ?? asString(service.name) ?? asString(record.serviceId) ?? "Sin servicio",
    scheduledAt:
      toIsoString(timeSlot.startAt) ??
      toIsoString(record.scheduledAt) ??
      toIsoString(record.createdAt) ??
      new Date(0).toISOString(),
    status: FROM_PRISMA_STATUS[rawStatus] ?? "pending",
  };
}

export function toLegacyPatientSummary(item: unknown): PatientSummary {
  const record = asRecord(item);
  const user = asRecord(record.user);

  return {
    id: asString(record.id) ?? asString(record.userId) ?? "unknown",
    name: joinName(user) ?? asString(record.name) ?? "Sin nombre",
    email: asString(user.email) ?? asString(record.email) ?? "",
    phone: asString(record.phone) ?? asString(user.phone) ?? "",
  };
}
