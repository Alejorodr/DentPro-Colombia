import NextAuth from "next-auth";
import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

import { authConfig } from "@/auth.config";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { DentProPrismaAdapter } from "@/lib/auth/dentpro-prisma-adapter";
import { findUserByEmail, findUserById } from "@/lib/auth/users";
import { getJwtSecretString } from "@/lib/auth/jwt";
import { getInferredAuthBaseUrl, getSessionCookieName, isLocalE2EAuthRuntime } from "@/lib/auth/runtime";
import { resolveSessionUser } from "@/lib/auth/session";

type AuthenticatedUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: UserRole;
  professionalId?: string | null;
  patientId?: string | null;
  mustChangePassword?: boolean;
};

export type AuthSession = { user?: AuthenticatedUser | null } | null;

const { handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DentProPrismaAdapter(),
});

export { handlers, signIn, signOut };

// @auth/core@0.41.2 calls next/headers cookies() synchronously; Next.js 16
// made cookies() strictly async. Decode the JWT with the async cookies API,
// then resolve identity and authorization state against the current database row.
export async function auth(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const baseUrl = getInferredAuthBaseUrl();
  const cookieName = getSessionCookieName(baseUrl);
  const tokenValue = cookieStore.get(cookieName)?.value;

  if (tokenValue) {
    try {
      const token = await decode({
        token: tokenValue,
        secret: getJwtSecretString(),
        salt: cookieName,
      }) as Record<string, unknown> | null;

      const userId =
        typeof token?.["userId"] === "string" ? token["userId"] :
        typeof token?.["sub"] === "string" ? token["sub"] : "";
      const currentUser = userId ? await findUserById(userId) : null;
      const sessionUser = resolveSessionUser(token ?? {}, currentUser);

      if (sessionUser) {
        return { user: sessionUser };
      }
    } catch {
      // Decode failed — fall through to unauthenticated
    }
  }

  // E2E test bypass (local only)
  if (isLocalE2EAuthRuntime(baseUrl)) {
    const testRole = cookieStore.get("dentpro-test-role")?.value ?? "";
    const testUserEmail = cookieStore.get("dentpro-test-user-email")?.value ?? "";
    if (isUserRole(testRole) && testUserEmail) {
      const persistedUser = await findUserByEmail(testUserEmail);
      if (persistedUser) {
        return {
          user: {
            id: persistedUser.id,
            name: persistedUser.name,
            email: persistedUser.email,
            image: null,
            role: persistedUser.role,
            professionalId: persistedUser.professionalId ?? null,
            patientId: persistedUser.patientId ?? null,
          },
        };
      }
    }
  }

  return null;
}
