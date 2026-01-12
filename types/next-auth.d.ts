import { type DefaultSession } from "next-auth";
import "next-auth/jwt";

import type { UserRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      professionalId?: string | null;
      patientId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    professionalId?: string | null;
    patientId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: UserRole;
    professionalId?: string | null;
    patientId?: string | null;
  }
}
