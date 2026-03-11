import { type AppointmentStatus, type PrismaClient, type Role } from "@prisma/client";

import { getAppointmentEventLabel, appointmentStatusPastLabel } from "@/lib/appointments/activity";
import { queryFeedSources } from "@/lib/activity/queryFeed";
import { getPrismaClient } from "@/lib/prisma";

export type ActivityFeedItem = {
  id: string;
  type: string;
  appointmentId?: string;
  patientName?: string;
  actor: string;
  timestamp: string;
  message: string;
  metadata?: Record<string, unknown>;
  link?: string;
};

export type ActivityFeedFilters = {
  type?: string;
  appointmentId?: string;
  since?: Date;
  until?: Date;
};

export type ActivityFeedResult = {
  events: ActivityFeedItem[];
  nextCursor: string | null;
};

export type FeedCursor = {
  timestamp: Date;
  source: "event" | "notification";
  sourceId: string;
};


function roleAppointmentLink(role: Role, appointmentId: string) {
  if (role === "PACIENTE") return "/portal/client/appointments";
  if (role === "PROFESIONAL") return `/portal/professional?appointment=${appointmentId}`;
  return `/portal/receptionist/schedule?appointment=${appointmentId}`;
}

function normalizeType(action: string) {
  return action === "status_updated" ? "appointment_status_changed" : `appointment_${action}`;
}

function encodeCursor(item: ActivityFeedItem) {
  const [source, sourceId] = item.id.split("_", 2);
  if (!source || !sourceId) return item.timestamp;
  return `${item.timestamp}|${source}|${sourceId}`;
}

function decodeCursor(cursor?: Date | string): FeedCursor | null {
  if (!cursor) return null;
  if (cursor instanceof Date) {
    return { timestamp: cursor, source: "event", sourceId: "" };
  }

  if (!cursor.includes("|")) {
    const parsed = new Date(cursor);
    if (Number.isNaN(parsed.getTime())) return null;
    return { timestamp: parsed, source: "event", sourceId: "" };
  }

  const [timestamp, source, sourceId] = cursor.split("|");
  const parsedTimestamp = new Date(timestamp ?? "");
  if (Number.isNaN(parsedTimestamp.getTime()) || (source !== "event" && source !== "notification")) {
    return null;
  }

  return {
    timestamp: parsedTimestamp,
    source,
    sourceId: sourceId ?? "",
  };
}

function compareItemsDesc(a: ActivityFeedItem, b: ActivityFeedItem) {
  const dateDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  if (dateDiff !== 0) return dateDiff;
  return b.id.localeCompare(a.id);
}

export async function getActivityFeed(params: {
  userId: string;
  role: Role;
  limit?: number;
  cursor?: Date | string;
  filters?: ActivityFeedFilters;
  prismaClient?: PrismaClient;
}): Promise<ActivityFeedResult> {
  const prisma = params.prismaClient ?? getPrismaClient();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const filters = params.filters ?? {};
  const decodedCursor = decodeCursor(params.cursor);

  const sourceHint = filters.type?.startsWith("notification_")
    ? "notification"
    : filters.type?.startsWith("appointment_")
      ? "event"
      : "mixed";
  const eventWindowSize = sourceHint === "notification" ? 0 : Math.min(Math.ceil(limit * 0.75) + 5, 100);
  const notificationWindowSize = sourceHint === "event" ? 0 : Math.min(Math.ceil(limit * 0.75) + 5, 100);

  const [events, notifications] = await queryFeedSources({
    prisma,
    userId: params.userId,
    role: params.role,
    filters,
    decodedCursor,
    eventWindowSize,
    notificationWindowSize,
  });

  const eventItems: ActivityFeedItem[] = events.map((event) => {
    const actor = event.actorUser
      ? `${event.actorUser.name ?? ""} ${event.actorUser.lastName ?? ""}`.trim() || event.actorUser.email || "Sistema"
      : event.actorRole ?? "Sistema";
    const patientName = `${event.appointment.patient.user.name ?? "Paciente"} ${event.appointment.patient.user.lastName ?? ""}`.trim();

    const type = normalizeType(event.action);

    const message = event.action === "status_updated" && event.newStatus
      ? `Estado cambiado a ${appointmentStatusPastLabel(event.newStatus as AppointmentStatus)}.`
      : getAppointmentEventLabel(event.action, event.newStatus);

    return {
      id: `event_${event.id}`,
      type,
      appointmentId: event.appointmentId,
      patientName,
      actor,
      timestamp: event.createdAt.toISOString(),
      message,
      metadata: (event.metadata as Record<string, unknown> | null) ?? undefined,
      link: roleAppointmentLink(params.role, event.appointmentId),
    };
  });

  const notificationItems: ActivityFeedItem[] = notifications.map((notification) => ({
    id: `notification_${notification.id}`,
    type: `notification_${notification.type}`,
    appointmentId: notification.entityType === "appointment" ? notification.entityId ?? undefined : undefined,
    actor: "Sistema",
    timestamp: notification.createdAt.toISOString(),
    message: notification.body?.trim() || notification.title,
    metadata: { title: notification.title, read: Boolean(notification.readAt) },
    link: notification.entityType === "appointment" && notification.entityId
      ? roleAppointmentLink(params.role, notification.entityId)
      : undefined,
  }));

  const merged = [...eventItems, ...notificationItems]
    .sort(compareItemsDesc)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);

  const filteredMerged = filters.type
    ? merged.filter((item) => item.type === filters.type)
    : merged;

  const eventsSlice = filteredMerged.slice(0, limit);
  const lastItem = eventsSlice.at(-1);
  const nextCursor = filteredMerged.length > limit && lastItem ? encodeCursor(lastItem) : null;

  // Nota técnica P11: este feed continúa con merge in-memory por compatibilidad
  // y ahora centraliza sus queries en queryFeedSources para simplificar evolución.
  // Siguiente paso recomendado: materialized activity stream / SQL UNION feed.

  return {
    events: eventsSlice,
    nextCursor,
  };
}
