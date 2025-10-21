import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Cast para evitar el error "no call signatures" en TS
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
    async jwt({ token, user }) { if (user) (token as any).role = (user as any).role ?? "user"; return token; },
    async session({ session, token }) { (session as any).role = (token as any).role ?? "user"; return session; },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;
