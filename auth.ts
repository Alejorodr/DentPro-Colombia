import { cookies } from "next/headers";
import { jwtVerify } from "jose";

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

const encoder = new TextEncoder();

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is not configured");
  }

  return encoder.encode(secret);
}

export async function auth(): Promise<AuthSession | null> {
  const token = cookies().get("auth_token")?.value;
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
