import { Role, type PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

export type NotificationPayload = {
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

export async function createReceptionNotifications(
  payload: NotificationPayload,
  prismaClient?: PrismaClient,
): Promise<void> {
  const prisma = prismaClient ?? getPrismaClient();
  const recipients = await prisma.user.findMany({
    where: { role: Role.RECEPCIONISTA },
    select: { id: true },
  });

  if (recipients.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: recipients.map((recipient) => ({
      userId: recipient.id,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
    })),
  });
}
