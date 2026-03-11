import { type AppointmentStatus, type PrismaClient, type Role } from "@prisma/client";

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

function roleAppointmentLink(role: Role, appointmentId: string) {
  if (role === "PACIENTE") return "/portal/client/appointments";
  if (role === "PROFESIONAL") return `/portal/professional?appointment=${appointmentId}`;
  return `/portal/receptionist/schedule?appointment=${appointmentId}`;
}

export async function getActivityFeed(params: {
  userId: string;
  role: Role;
  limit?: number;
  prismaClient?: PrismaClient;
}): Promise<ActivityFeedItem[]> {
  const prisma = params.prismaClient ?? getPrismaClient();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

  const [patientProfile, professionalProfile] = await Promise.all([
    params.role === "PACIENTE"
      ? prisma.patientProfile.findUnique({ where: { userId: params.userId }, select: { id: true } })
      : Promise.resolve(null),
    params.role === "PROFESIONAL"
      ? prisma.professionalProfile.findUnique({ where: { userId: params.userId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  const eventWhere =
    params.role === "PACIENTE"
      ? { appointment: { patientId: patientProfile?.id ?? "__none__" } }
      : params.role === "PROFESIONAL"
        ? { appointment: { professionalId: professionalProfile?.id ?? "__none__" } }
        : {};

  const [events, notifications] = await Promise.all([
    prisma.appointmentEvent.findMany({
      where: eventWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
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
      where: { userId: params.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const eventItems: ActivityFeedItem[] = events.map((event) => {
    const actor = event.actorUser
      ? `${event.actorUser.name ?? ""} ${event.actorUser.lastName ?? ""}`.trim() || event.actorUser.email || "Sistema"
      : event.actorRole ?? "Sistema";
    const patientName = `${event.appointment.patient.user.name ?? "Paciente"} ${event.appointment.patient.user.lastName ?? ""}`.trim();

    const type = event.action === "status_updated" ? "appointment_status_changed" : `appointment_${event.action}`;

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

  return [...eventItems, ...notificationItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
