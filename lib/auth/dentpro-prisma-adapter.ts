import { PrismaAdapter } from "@auth/prisma-adapter";
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
  // Lazy — never call getPrismaClient() at construction time because this function runs
  // at module-load of auth.ts. Eager initialization triggers DATABASE_URL validation before
  // the server is ready (and throws during `next build` preview deployments).
  let _prisma: ReturnType<typeof getPrismaClient> | null = null;
  let _base: Adapter | null = null;

  function db() {
    if (!_prisma) _prisma = getPrismaClient();
    return _prisma;
  }

  function getBase(): Adapter {
    if (!_base) _base = PrismaAdapter(db());
    return _base;
  }

  return new Proxy({} as Adapter, {
    get(_target, prop) {
      // @auth/prisma-adapter uses Prisma fluent API (.user()) in getUserByAccount,
      // which breaks on $extends-wrapped clients. Use include instead.
      if (prop === "getUserByAccount") {
        return async ({ provider, providerAccountId }: { provider: string; providerAccountId: string }) => {
          const account = await db().account.findUnique({
            where: { provider_providerAccountId: { provider, providerAccountId } },
            include: { user: true },
          });
          return account?.user ?? null;
        };
      }

      if (prop === "createUser") {
        return async (user: AdapterUser) => {
          const prisma = db();
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
        };
      }

      const base = getBase();
      const val = base[prop as keyof Adapter];
      return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(base) : val;
    },
  });
}
