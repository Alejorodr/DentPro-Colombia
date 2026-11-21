import type { DatabaseUser } from "./users";
import { isUserRole, type UserRole } from "./roles";

type SessionTokenClaims = {
  userId?: unknown;
  sub?: unknown;
  role?: unknown;
  iat?: unknown;
  invalidated?: unknown;
  name?: unknown;
  email?: unknown;
  picture?: unknown;
};

export type ResolvedSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  professionalId: string | null;
  patientId: string | null;
  mustChangePassword: boolean;
};

function getTokenUserId(token: SessionTokenClaims): string {
  if (typeof token.userId === "string") return token.userId;
  if (typeof token.sub === "string") return token.sub;
  return "";
}

function tokenWasIssuedBeforePasswordChange(token: SessionTokenClaims, user: DatabaseUser): boolean {
  if (!user.passwordChangedAt) return false;
  if (typeof token.iat !== "number") return true;
  return token.iat * 1000 < user.passwordChangedAt.getTime();
}

export function resolveSessionUser(
  token: SessionTokenClaims,
  currentUser: DatabaseUser | null,
): ResolvedSessionUser | null {
  if (token.invalidated || !currentUser || !currentUser.active) return null;

  const userId = getTokenUserId(token);
  if (!userId || userId !== currentUser.id) return null;
  if (typeof token.role !== "string" || !isUserRole(token.role) || token.role !== currentUser.role) return null;
  if (tokenWasIssuedBeforePasswordChange(token, currentUser)) return null;

  return {
    id: currentUser.id,
    name: currentUser.name ?? null,
    email: currentUser.email ?? null,
    image: typeof token.picture === "string" ? token.picture : null,
    role: currentUser.role,
    professionalId: currentUser.professionalId ?? null,
    patientId: currentUser.patientId ?? null,
    mustChangePassword: currentUser.mustChangePassword,
  };
}
