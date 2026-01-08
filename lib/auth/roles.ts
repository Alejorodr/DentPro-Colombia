export const userRoles = [
  "PACIENTE",
  "PROFESIONAL",
  "RECEPCIONISTA",
  "ADMINISTRADOR",
] as const;

export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  PACIENTE: "Paciente",
  PROFESIONAL: "Profesional",
  RECEPCIONISTA: "Recepcionista",
  ADMINISTRADOR: "Administrador",
};

export const roleSlugMap: Record<UserRole, string> = {
  PACIENTE: "paciente",
  PROFESIONAL: "profesional",
  RECEPCIONISTA: "recepcionista",
  ADMINISTRADOR: "admin",
};

export function isUserRole(role: string): role is UserRole {
  return (userRoles as readonly string[]).includes(role);
}

export function roleFromSlug(slug: string): UserRole | null {
  const entry = Object.entries(roleSlugMap).find(([, value]) => value === slug);
  return entry ? (entry[0] as UserRole) : null;
}

export function getDefaultDashboardPath(role: UserRole): string {
  return `/portal/${roleSlugMap[role]}`;
}
