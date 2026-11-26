import type { PrismaClient } from "@prisma/client";

import { getInferredAuthBaseUrl, isLocalE2EAuthRuntime } from "@/lib/auth/runtime";

/**
 * Secreto TOTP fijo para los usuarios sembrados en E2E (DOG-28). Es público a propósito: los
 * tests calculan con él el código del segundo paso. Solo se usa cuando el runtime es E2E local
 * (nunca en Vercel), igual que el resto de los atajos de autenticación de pruebas.
 */
export const E2E_MFA_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

/** Deja a los usuarios con el MFA activo usando el secreto de pruebas. No hace nada fuera de E2E local. */
export async function enrollSeededUsersInE2EMfa(prisma: PrismaClient, userIds: string[]): Promise<void> {
  if (!isLocalE2EAuthRuntime(getInferredAuthBaseUrl()) || userIds.length === 0) return;

  const enabledAt = new Date();
  for (const userId of userIds) {
    await prisma.userMfa.upsert({
      where: { userId },
      create: { userId, secret: E2E_MFA_SECRET, enabledAt },
      // lastUsedStep se reinicia para que cada corrida pueda usar el código del momento.
      update: { secret: E2E_MFA_SECRET, enabledAt, lastUsedStep: null },
    });
  }
  await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { mfaEnabled: true } });
}
