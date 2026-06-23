import NextAuth from "next-auth";
import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

import { authConfig } from "@/auth.config";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { DentProPrismaAdapter } from "@/lib/auth/dentpro-prisma-adapter";
import { findUserByEmail } from "@/lib/auth/users";
import { getJwtSecretString } from "@/lib/auth/jwt";
import { getInferredAuthBaseUrl, getSessionCookieName, isLocalE2EAuthRuntime } from "@/lib/auth/runtime";

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
// made cookies() strictly async — baseAuth() throws instead of returning null,
// so the fallback never runs. Skip baseAuth entirely and decode the JWT
// directly using await cookies(), which is the proper async API.
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

      if (token && !token["invalidated"]) {
        const role = token["role"];
        const userId =
          typeof token["userId"] === "string" ? token["userId"] :
          typeof token["sub"] === "string" ? token["sub"] : "";

        if (userId && isUserRole(role as string)) {
          return {
            user: {
              id: userId,
              name: (token["name"] as string | null) ?? null,
              email: (token["email"] as string | null) ?? null,
              image: (token["picture"] as string | null) ?? null,
              role: role as UserRole,
              professionalId: (token["professionalId"] as string | null) ?? null,
              patientId: (token["patientId"] as string | null) ?? null,
              mustChangePassword: (token["mustChangePassword"] as boolean | null) ?? false,
            },
          };
        }
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
