import NextAuth from "next-auth";
import { cookies } from "next/headers";

import { authConfig } from "@/auth.config";
import { isUserRole } from "@/lib/auth/roles";
import { findUserByEmail } from "@/lib/auth/users";
import { getInferredAuthBaseUrl, isLocalE2EAuthRuntime } from "@/lib/auth/runtime";

type AuthenticatedUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: import("@/lib/auth/roles").UserRole;
  professionalId?: string | null;
  patientId?: string | null;
};

export type AuthSession = { user?: AuthenticatedUser | null } | null;

const { handlers, auth: baseAuth, signIn, signOut } = NextAuth(authConfig);

export { handlers, signIn, signOut };

export async function auth(): Promise<AuthSession> {
  const session = (await baseAuth()) as AuthSession;
  if (session?.user) return session;

  const baseUrl = getInferredAuthBaseUrl();
  if (!isLocalE2EAuthRuntime(baseUrl)) return session;

  const cookieStore = await cookies();
  const testRole = cookieStore.get("dentpro-test-role")?.value ?? "";
  const testUserEmail = cookieStore.get("dentpro-test-user-email")?.value ?? "";
  if (!isUserRole(testRole) || !testUserEmail) return session;

  const persistedUser = await findUserByEmail(testUserEmail);
  if (!persistedUser) return session;

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
