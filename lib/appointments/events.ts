import { type AppointmentStatus, type Prisma, type PrismaClient, type Role } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type RecordAppointmentEventInput = {
  appointmentId: string;
  action: string;
  actorUserId?: string | null;
  actorRole?: Role | null;
  previousStatus?: AppointmentStatus | null;
  newStatus?: AppointmentStatus | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recordAppointmentEvent(
  input: RecordAppointmentEventInput,
  prismaClient?: PrismaClient | Prisma.TransactionClient,
) {
  const prisma = prismaClient ?? getPrismaClient();
  const event = await prisma.appointmentEvent.create({
    data: {
      appointmentId: input.appointmentId,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      previousStatus: input.previousStatus ?? null,
      newStatus: input.newStatus ?? null,
      metadata: input.metadata ?? undefined,
    },
  });

  logger.info({
    event: "appointment.event.recorded",
    appointmentId: input.appointmentId,
    actor: input.actorRole ?? "SYSTEM",
    action: input.action,
    timestamp: new Date().toISOString(),
  });

  return event;
}
