import NextAuth from "next-auth";

declare module "next-auth" {
  interface DefaultSession {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: import("./lib/auth/roles").UserRole;
    };
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: import("./lib/auth/roles").UserRole;
    };
  }

  interface User {
    role: import("./lib/auth/roles").UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: import("./lib/auth/roles").UserRole;
  }
}
