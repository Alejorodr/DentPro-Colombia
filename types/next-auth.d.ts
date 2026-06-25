import "next-auth";
import "next-auth/jwt";

import type { UserRole } from "@/lib/auth/roles";

// next-auth re-exports Session and User from @auth/core/types.
// useSession() client hook resolves Session directly from @auth/core/types,
// so we must augment that module — not the next-auth re-export namespace.
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      userId?: string;
      role: UserRole;
      professionalId?: string | null;
      patientId?: string | null;
      defaultDashboardPath?: string;
      passwordChangedAt?: string | null;
      invalidated?: boolean;
    };
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
    mustChangePassword?: boolean;
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
