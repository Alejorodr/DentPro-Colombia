import { Role, type PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

export async function isEmailEnabledForUser(
  userId: string,
  role: Role,
  prismaClient?: PrismaClient,
): Promise<boolean> {
  const prisma = prismaClient ?? getPrismaClient();
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId },
    select: { emailEnabled: true },
  });

  if (preference) {
    return preference.emailEnabled;
  }

  return role === Role.PACIENTE;
}
