import NextAuth from "next-auth";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { authConfig } from "@/auth.config";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { DentProPrismaAdapter } from "@/lib/auth/dentpro-prisma-adapter";
import { findUserByEmail } from "@/lib/auth/users";
import { getInferredAuthBaseUrl, isLocalE2EAuthRuntime } from "@/lib/auth/runtime";

type AuthenticatedUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: UserRole;
  professionalId?: string | null;
  patientId?: string | null;
};

export type AuthSession = { user?: AuthenticatedUser | null } | null;

const { handlers, auth: baseAuth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DentProPrismaAdapter(),
});

export { handlers, signIn, signOut };

export async function auth(): Promise<AuthSession> {
  const session = (await baseAuth()) as AuthSession;
  if (session?.user) return session;

  // @auth/core@0.41.2 calls next/headers cookies() synchronously; Next.js 16
  // made cookies() strictly async, so baseAuth() returns null in server components.
  // Call the session handler directly with a fake Request that carries the cookies —
  // handlers.GET reads from request.headers.get("cookie"), not from next/headers.
  const cookieStore = await cookies();
  const baseUrl = getInferredAuthBaseUrl();

  try {
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const sessionUrl = `${baseUrl || "http://localhost:3000"}/api/auth/session`;
    const fakeRequest = new NextRequest(sessionUrl, {
      headers: {
        cookie: cookieHeader,
        ...(baseUrl ? { host: new URL(baseUrl).host } : {}),
      },
    });
    const response = await handlers.GET(fakeRequest);
    if (response.ok) {
      const data = (await response.json()) as { user?: AuthenticatedUser | null } | null;
      if (data?.user?.role && isUserRole(data.user.role)) {
        return { user: data.user };
      }
    }
  } catch {
    // Fall through to unauthenticated
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

  return session;
}
