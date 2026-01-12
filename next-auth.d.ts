import NextAuth from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface DefaultSession {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: import("./lib/auth/roles").UserRole;
      professionalId?: string | null;
      patientId?: string | null;
    };
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: import("./lib/auth/roles").UserRole;
      professionalId?: string | null;
      patientId?: string | null;
    };
  }

  interface User {
    id: string;
    role: import("./lib/auth/roles").UserRole;
    professionalId?: string | null;
    patientId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: import("./lib/auth/roles").UserRole;
    professionalId?: string | null;
    patientId?: string | null;
  }
}
