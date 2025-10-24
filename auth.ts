import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import { getJwtSecretKey } from "@/lib/auth/jwt";
import { isUserRole, type UserRole } from "@/lib/auth/roles";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface AuthSession {
  user: AuthenticatedUser;
}

export async function auth(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    const { sub, email, name, role } = payload;

    if (typeof sub !== "string") {
      return null;
    }

    if (typeof email !== "string") {
      return null;
    }

    if (typeof name !== "string" && name !== null && name !== undefined) {
      return null;
    }

    if (typeof role !== "string" || !isUserRole(role)) {
      return null;
    }

    return {
      user: {
        id: sub,
        email,
        name: typeof name === "string" ? name : null,
        role,
      },
    };
  } catch (error) {
    console.error("Invalid auth token", error);
    return null;
  }
}
