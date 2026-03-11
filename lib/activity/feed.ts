import { type AppointmentStatus, type Prisma, type PrismaClient, type Role } from "@prisma/client";

import { getAppointmentEventLabel, appointmentStatusPastLabel } from "@/lib/appointments/activity";
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

function roleAppointmentLink(role: Role, appointmentId: string) {
  if (role === "PACIENTE") return "/portal/client/appointments";
  if (role === "PROFESIONAL") return `/portal/professional?appointment=${appointmentId}`;
  return `/portal/receptionist/schedule?appointment=${appointmentId}`;
}

function normalizeType(action: string) {
  return action === "status_updated" ? "appointment_status_changed" : `appointment_${action}`;
}

export async function getActivityFeed(params: {
  userId: string;
  role: Role;
  limit?: number;
  cursor?: Date;
  filters?: ActivityFeedFilters;
  prismaClient?: PrismaClient;
}): Promise<ActivityFeedResult> {
  const prisma = params.prismaClient ?? getPrismaClient();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const filters = params.filters ?? {};

  const [patientProfile, professionalProfile] = await Promise.all([
    params.role === "PACIENTE"
      ? prisma.patientProfile.findUnique({ where: { userId: params.userId }, select: { id: true } })
      : Promise.resolve(null),
    params.role === "PROFESIONAL"
      ? prisma.professionalProfile.findUnique({ where: { userId: params.userId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  const appointmentScopedWhere =
    params.role === "PACIENTE"
      ? { appointment: { patientId: patientProfile?.id ?? "__none__" } }
      : params.role === "PROFESIONAL"
        ? { appointment: { professionalId: professionalProfile?.id ?? "__none__" } }
        : {};

  const dateFilter: Prisma.DateTimeFilter = {
    ...(params.cursor ? { lt: params.cursor } : {}),
    ...(filters.since ? { gte: filters.since } : {}),
    ...(filters.until ? { lte: filters.until } : {}),
  };

  const appointmentEventWhere: Prisma.AppointmentEventWhereInput = {
    ...appointmentScopedWhere,
    ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    ...(filters.appointmentId ? { appointmentId: filters.appointmentId } : {}),
    ...(filters.type?.startsWith("appointment_")
      ? { action: filters.type === "appointment_status_changed" ? "status_updated" : filters.type.replace("appointment_", "") }
      : {}),
  };

  const notificationWhere: Prisma.NotificationWhereInput = {
    userId: params.userId,
    ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    ...(filters.appointmentId ? { entityType: "appointment", entityId: filters.appointmentId } : {}),
    ...(filters.type?.startsWith("notification_") ? { type: filters.type.replace("notification_", "") } : {}),
  };

  const [events, notifications] = await Promise.all([
    prisma.appointmentEvent.findMany({
      where: appointmentEventWhere,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        actorUser: { select: { name: true, lastName: true, email: true } },
        appointment: {
          select: {
            id: true,
            patient: { select: { user: { select: { name: true, lastName: true } } } },
          },
        },
      },
    }),
    prisma.notification.findMany({
      where: notificationWhere,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    }),
  ]);

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
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredMerged = filters.type
    ? merged.filter((item) => item.type === filters.type)
    : merged;

  const eventsSlice = filteredMerged.slice(0, limit);
  const lastItem = eventsSlice.at(-1);
  const nextCursor = filteredMerged.length > limit && lastItem ? lastItem.timestamp : null;

  return {
    events: eventsSlice,
    nextCursor,
  };
}
