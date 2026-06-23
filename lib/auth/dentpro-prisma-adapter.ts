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

  // IMPORTANT: Do NOT use Proxy here. @auth/core's adapterErrorHandler wraps the adapter
  // by calling Object.keys(adapter), which only sees own enumerable properties. A Proxy
  // with an empty target ({}) returns [] from Object.keys, so every method becomes undefined
  // and the OAuth callback throws "TypeError: a is not a function".
  // A plain object makes all methods visible as own enumerable properties.
  return {
    getUserByAccount: async ({ provider, providerAccountId }) => {
      const account = await db().account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return (account?.user ?? null) as AdapterUser | null;
    },

    createUser: async (user: AdapterUser) => {
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

      return createdUser as AdapterUser;
    },

    async getUser(id) { return (await getBase().getUser!(id)) as AdapterUser | null; },
    async getUserByEmail(email) { return (await getBase().getUserByEmail!(email)) as AdapterUser | null; },
    async updateUser(user) { return (await getBase().updateUser!(user)) as AdapterUser; },
    async deleteUser(userId) { return getBase().deleteUser!(userId); },
    async linkAccount(account) { return getBase().linkAccount!(account); },
    async unlinkAccount(params) { return getBase().unlinkAccount!(params); },
    async createSession(session) { return getBase().createSession!(session); },
    async getSessionAndUser(sessionToken) { return getBase().getSessionAndUser!(sessionToken); },
    async updateSession(session) { return getBase().updateSession!(session); },
    async deleteSession(sessionToken) { return getBase().deleteSession!(sessionToken); },
    async createVerificationToken(token) { return getBase().createVerificationToken!(token); },
    async useVerificationToken(params) { return getBase().useVerificationToken!(params); },
  } as Adapter;
}
