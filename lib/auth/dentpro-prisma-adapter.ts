import type { Adapter, AdapterUser } from "next-auth/adapters";

import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

function splitNameParts(name: string): { name: string; lastName: string } {
  const compact = name.trim().replace(/\s+/g, " ");
  if (!compact) return { name: "Paciente", lastName: "DentPro" };
  const parts = compact.split(" ");
  if (parts.length === 1) return { name: parts[0], lastName: "DentPro" };
  return { name: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function extractSafeUserNames(user: AdapterUser): { name: string; lastName: string } {
  const explicitFirst = (user as AdapterUser & { firstName?: string | null }).firstName?.trim();
  const explicitLast = (user as AdapterUser & { lastName?: string | null }).lastName?.trim();
  if (explicitFirst && explicitLast) return { name: explicitFirst, lastName: explicitLast };
  if (user.name) return splitNameParts(user.name);
  return { name: explicitFirst || "Paciente", lastName: explicitLast || "DentPro" };
}

export function DentProPrismaAdapter(): Adapter {
  const prisma = getPrismaClient();
  const { PrismaAdapter } = require("@auth/prisma-adapter") as { PrismaAdapter: (client: unknown) => Adapter };
  const baseAdapter = PrismaAdapter(prisma);

  return {
    ...baseAdapter,
    async createUser(user) {
      const email = user.email.toLowerCase();
      const { name, lastName } = extractSafeUserNames(user);

      const createdUser = await prisma.user.create({
        data: {
          email,
          name,
          lastName,
          role: "PACIENTE",
          passwordHash: null,
          emailVerified: user.emailVerified ?? null,
          image: user.image ?? null,
          patient: {
            create: {
              avatarUrl: user.image ?? null,
            },
          },
        },
      });

      void logAuditEvent({
        action: "auth.oauth.patient_created",
        resourceType: "user",
        resourceId: createdUser.id,
        targetLabel: createdUser.email,
        status: "success",
        metadata: {
          provider: "google",
          emailDomain: createdUser.email.split("@")[1] ?? null,
          reason: "google_auto_provision",
        },
      });

      return createdUser;
    },
  };
}
