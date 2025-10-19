import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { sqliteAdapter } from "./adapter";
import { authenticateUser, findUserById } from "./users";
import type { UserRole } from "./roles";

export const authOptions: NextAuthOptions = {
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
    strategy: "database",
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
      const userId = (user as { id?: string } | null)?.id ?? tokenData.sub ?? session.user.id ?? "";
      if (!userId) {
        session.user.role = tokenData.role ?? "patient";
        return session;
      }

      const dbUser = findUserById(userId);
      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role;
        session.user.name = dbUser.name ?? undefined;
        session.user.email = dbUser.email;
      } else {
        session.user.id = userId;
        session.user.role = tokenData.role ?? "patient";
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET ?? "dentpro-secret",
};
