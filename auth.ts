import NextAuth from "next-auth";
import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

import { getJwtSecretString } from "@/lib/auth/jwt";
import { getDefaultDashboardPath, isUserRole } from "@/lib/auth/roles";
import { authenticateUser, findUserById } from "@/lib/auth/users";
type AuthenticatedUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: import("@/lib/auth/roles").UserRole;
  defaultDashboardPath?: string;
};
export type AuthSession = { user?: AuthenticatedUser | null } | null;
type SessionToken = JWT & {
  role?: import("@/lib/auth/roles").UserRole;
  defaultDashboardPath?: string;
};

export const authOptions = {
  secret: getJwtSecretString(),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await authenticateUser(email, password);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          defaultDashboardPath: getDefaultDashboardPath(user.role),
        } as const;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: SessionToken; user?: AuthenticatedUser | null }) {
      if (user) {
        const roleCandidate =
          typeof (user as { role?: unknown }).role === "string" ? (user as { role: string }).role : "";

        token.role = isUserRole(roleCandidate) ? roleCandidate : token.role;
        token.id = (user as { id?: unknown }).id ?? token.id;

        const defaultPathCandidate =
          typeof (user as { defaultDashboardPath?: unknown }).defaultDashboardPath === "string"
            ? (user as { defaultDashboardPath: string }).defaultDashboardPath
            : undefined;

        token.defaultDashboardPath = defaultPathCandidate ?? token.defaultDashboardPath;
      } else if (token.sub && !token.role) {
        const dbUser = await findUserById(token.sub);
        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: { user?: AuthenticatedUser | null } & Record<string, unknown>;
      token: SessionToken;
    }) {
      const role = token.role ?? "";
      session.user = {
        id: typeof token.sub === "string" ? token.sub : "",
        name: session.user?.name ?? null,
        email: session.user?.email ?? null,
        image: session.user?.image ?? null,
        role: isUserRole(role) ? role : undefined,
      };

      if (token.defaultDashboardPath && typeof token.defaultDashboardPath === "string") {
        (session.user as { defaultDashboardPath?: string }).defaultDashboardPath =
          token.defaultDashboardPath;
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};

// The NextAuth typings are not compatible with `moduleResolution: "bundler"` here, so we cast
// the default export to a callable handler to keep the route signature type-safe for Next.js.
const handler = (NextAuth as unknown as (options: typeof authOptions) => any)(authOptions);

export async function auth(): Promise<AuthSession> {
  return (await getServerSession(authOptions as any)) as AuthSession;
}

export { handler as GET, handler as POST };
