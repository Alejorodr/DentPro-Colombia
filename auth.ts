import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

// Cast para evitar el "no call signatures"
const nextAuth: any = (NextAuth as any)({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(c) {
        if (c?.email === "admin@dentpro.co" && c?.password === "demo123") {
          return { id: "1", name: "Admin", email: "admin@dentpro.co", role: "admin" };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) (token as any).role = (user as any).role ?? "user";
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      (session as any).role = (token as any).role ?? "user";
      return session;
    },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;

