import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth, { getServerSession as nextGetServerSession } from "next-auth/next";

import { sqliteAdapter } from "./adapter";
import { authenticateUser, findUserById } from "./users";
import type { UserRole } from "./roles";

export type NextAuthConfig = Parameters<typeof NextAuth>[2];

export const authOptions: NextAuthConfig = {
  adapter: sqliteAdapter,
  providers: [
    CredentialsProvider({
      name: "Credenciales DentPro",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await authenticateUser(credentials.email, credentials.password);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          role: user.role,
        } as { id: string; name?: string; email: string; role: UserRole };
      },
    }),
  ],
  session: {
    strategy: "database" as const,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: UserRole }).role;
      }
      return token;
    },
    async session({ session, user, token }) {
      if (!session.user) {
        return session;
      }

      const tokenData = (typeof token === "object" && token !== null ? token : {}) as {
        sub?: string;
        role?: UserRole;
      };
      const sessionUser = (session.user ?? (session.user = {})) as {
        id?: string;
        role?: UserRole;
        name?: string | null;
        email?: string | null;
      };
      const userId = (user as { id?: string } | null)?.id ?? tokenData.sub ?? sessionUser.id ?? "";
      if (!userId) {
        sessionUser.role = tokenData.role ?? "patient";
        return session;
      }

      const dbUser = findUserById(userId);
      if (dbUser) {
        sessionUser.id = dbUser.id;
        sessionUser.role = dbUser.role;
        sessionUser.name = dbUser.name ?? undefined;
        sessionUser.email = dbUser.email;
      } else {
        sessionUser.id = userId;
        sessionUser.role = tokenData.role ?? sessionUser.role ?? "patient";
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET ?? "dentpro-secret",
};

export async function getServerAuthSession() {
  return nextGetServerSession(authOptions);
}
