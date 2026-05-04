import { type DefaultSession } from "next-auth";
import "next-auth/jwt";

import type { UserRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: (DefaultSession["user"] & {
      id: string;
      userId?: string;
      role: UserRole;
      professionalId?: string | null;
      patientId?: string | null;
      defaultDashboardPath?: string;
      passwordChangedAt?: string | null;
      invalidated?: boolean;
    });
  }

  interface User {
    id?: string;
    userId?: string;
    role?: UserRole;
    professionalId?: string | null;
    patientId?: string | null;
    defaultDashboardPath?: string;
    passwordChangedAt?: Date | string | null;
    invalidated?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    professionalId?: string | null;
    patientId?: string | null;
    defaultDashboardPath?: string;
    passwordChangedAt?: string | null;
    invalidated?: boolean;
  }
}
