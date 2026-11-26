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

  // DOG-28: una sesión con el segundo factor pendiente no está autenticada para la API.
  if (session?.user?.mfaPending) {
    return null;
  }

  return { id, role };
}

export function isAuthorized(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role);
}
