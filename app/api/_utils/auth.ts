import { auth } from "@/auth";
import { isUserRole, type UserRole } from "@/lib/auth/roles";

export type SessionUser = { id: string; role: UserRole };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;

  if (!id || !role || !isUserRole(role)) {
    return null;
  }

  return { id, role };
}

export function isAuthorized(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role);
}
