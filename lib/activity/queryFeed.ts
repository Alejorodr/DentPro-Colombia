import { type Prisma, type PrismaClient, type Role } from "@prisma/client";

type ActivityFeedFilters = {
  type?: string;
  appointmentId?: string;
  since?: Date;
  until?: Date;
};

type FeedCursor = {
  timestamp: Date;
  source: "event" | "notification";
  sourceId: string;
};

type FeedSource = FeedCursor["source"];

const SOURCE_RANK: Record<FeedSource, number> = {
  event: 1,
  notification: 2,
};

function buildCursorWhere<T extends Prisma.AppointmentEventWhereInput | Prisma.NotificationWhereInput>(
  cursor: FeedCursor | null,
  source: FeedSource,
  idField: "id",
  createdAtField: "createdAt",
): T | undefined {
  if (!cursor) return undefined;

  if (!cursor.sourceId) {
    return { [createdAtField]: { lt: cursor.timestamp } } as T;
  }

  const sourceRank = SOURCE_RANK[source];
  const cursorRank = SOURCE_RANK[cursor.source];
  if (sourceRank < cursorRank) {
    return {
      OR: [
        { [createdAtField]: { lt: cursor.timestamp } },
        { [createdAtField]: cursor.timestamp },
      ],
    } as T;
  }

  if (sourceRank > cursorRank) {
    return { [createdAtField]: { lt: cursor.timestamp } } as T;
  }

  return {
    OR: [
      { [createdAtField]: { lt: cursor.timestamp } },
      { [createdAtField]: cursor.timestamp, [idField]: { lt: cursor.sourceId } },
    ],
  } as T;
}

type QueryFeedSourcesParams = {
  prisma: PrismaClient;
  userId: string;
  role: Role;
  filters: ActivityFeedFilters;
  decodedCursor: FeedCursor | null;
  eventWindowSize: number;
  notificationWindowSize: number;
};

export async function queryFeedSources(params: QueryFeedSourcesParams) {
  const [patientProfile, professionalProfile] = await Promise.all([
    params.role === "PACIENTE"
      ? params.prisma.patientProfile.findUnique({ where: { userId: params.userId }, select: { id: true } })
      : Promise.resolve(null),
    params.role === "PROFESIONAL"
      ? params.prisma.professionalProfile.findUnique({ where: { userId: params.userId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  const appointmentScopedWhere =
    params.role === "PACIENTE"
      ? { appointment: { patientId: patientProfile?.id ?? "__none__" } }
      : params.role === "PROFESIONAL"
        ? { appointment: { professionalId: professionalProfile?.id ?? "__none__" } }
        : {};

  const dateFilter: Prisma.DateTimeFilter = {
    ...(params.filters.since ? { gte: params.filters.since } : {}),
    ...(params.filters.until ? { lte: params.filters.until } : {}),
  };

  const appointmentEventWhere: Prisma.AppointmentEventWhereInput = {
    ...appointmentScopedWhere,
    ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    ...(buildCursorWhere<Prisma.AppointmentEventWhereInput>(params.decodedCursor, "event", "id", "createdAt") ?? {}),
    ...(params.filters.appointmentId ? { appointmentId: params.filters.appointmentId } : {}),
    ...(params.filters.type?.startsWith("appointment_")
      ? { action: params.filters.type === "appointment_status_changed" ? "status_updated" : params.filters.type.replace("appointment_", "") }
      : {}),
  };

  const notificationWhere: Prisma.NotificationWhereInput = {
    userId: params.userId,
    ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    ...(buildCursorWhere<Prisma.NotificationWhereInput>(params.decodedCursor, "notification", "id", "createdAt") ?? {}),
    ...(params.filters.appointmentId ? { entityType: "appointment", entityId: params.filters.appointmentId } : {}),
    ...(params.filters.type?.startsWith("notification_") ? { type: params.filters.type.replace("notification_", "") } : {}),
  };

  return Promise.all([
    params.eventWindowSize > 0
      ? params.prisma.appointmentEvent.findMany({
        where: appointmentEventWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: params.eventWindowSize,
        select: {
          id: true,
          action: true,
          newStatus: true,
          metadata: true,
          createdAt: true,
          appointmentId: true,
          actorRole: true,
          actorUser: { select: { name: true, lastName: true, email: true } },
          appointment: {
            select: {
              patient: { select: { user: { select: { name: true, lastName: true } } } },
            },
          },
        },
      })
      : Promise.resolve([]),
    params.notificationWindowSize > 0
      ? params.prisma.notification.findMany({
        where: notificationWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: params.notificationWindowSize,
        select: {
          id: true,
          type: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          body: true,
          title: true,
          readAt: true,
        },
      })
      : Promise.resolve([]),
  ]);
}
