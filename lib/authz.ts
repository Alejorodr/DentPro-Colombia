import { auth } from "@/auth";
import { isUserRole, type UserRole } from "@/lib/auth/roles";

export type SessionUser = {
  id: string;
  role: UserRole;
};

export type AuthzFailure = {
  status: number;
  message: string;
};

export async function requireSession(): Promise<{ user: SessionUser } | { error: AuthzFailure }> {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;

  if (!id || !role || !isUserRole(role)) {
    return { error: { status: 401, message: "No autorizado." } };
  }

  return { user: { id, role } };
}

export function requireRole(user: SessionUser, roles: UserRole | UserRole[]): AuthzFailure | null {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    return { status: 403, message: "No autorizado." };
  }
  return null;
}

export function requireOwnershipOrRole(params: {
  user: SessionUser;
  ownerId?: string | null;
  rolesAllowed: UserRole[];
}): AuthzFailure | null {
  const { user, ownerId, rolesAllowed } = params;
  if (ownerId && ownerId === user.id) {
    return null;
  }
  if (rolesAllowed.includes(user.role)) {
    return null;
  }
  return { status: 403, message: "No autorizado." };
}
