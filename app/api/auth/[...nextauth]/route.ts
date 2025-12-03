import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getJwtSecretString } from "@/lib/auth/jwt";
import { getDefaultDashboardPath, isUserRole } from "@/lib/auth/roles";
import { authenticateUser, findUserById } from "@/lib/auth/users";

export const authOptions: NextAuthOptions = {
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
    async jwt({ token, user }) {
      if (user) {
        token.role = isUserRole((user as { role?: unknown }).role)
          ? ((user as { role: string }).role as string)
          : token.role;
        token.id = (user as { id?: unknown }).id ?? token.id;
        token.defaultDashboardPath =
          (user as { defaultDashboardPath?: unknown }).defaultDashboardPath ??
          token.defaultDashboardPath;
      } else if (token.sub && !token.role) {
        const dbUser = await findUserById(token.sub);
        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      const role = token.role;
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
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
