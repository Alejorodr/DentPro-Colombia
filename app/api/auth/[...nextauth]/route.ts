import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (creds?.email === "admin@dentpro.co" && creds?.password === "demo123") {
          return { id: "1", name: "Admin", email: "admin@dentpro.co", role: "admin" };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).role = (user as any).role ?? "user";
      return token;
    },
    async session({ session, token }) {
      (session as any).role = (token as any).role ?? "user";
      return session;
    },
  },
});

export { handler as GET, handler as POST };
