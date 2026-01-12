export const userRoles = [
  "PACIENTE",
  "PROFESIONAL",
  "RECEPCIONISTA",
  "ADMINISTRADOR",
] as const;

export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  PACIENTE: "Cliente",
  PROFESIONAL: "Profesional",
  RECEPCIONISTA: "Recepcionista",
  ADMINISTRADOR: "Administrador",
};

export const roleSlugMap: Record<UserRole, string> = {
  PACIENTE: "client",
  PROFESIONAL: "professional",
  RECEPCIONISTA: "receptionist",
  ADMINISTRADOR: "admin",
};

const roleSlugAliases: Record<UserRole, string[]> = {
  PACIENTE: ["paciente", "cliente", "client", "patient"],
  PROFESIONAL: ["profesional", "professional"],
  RECEPCIONISTA: ["recepcionista", "receptionist"],
  ADMINISTRADOR: ["admin"],
};

export function isUserRole(role: string): role is UserRole {
  return (userRoles as readonly string[]).includes(role);
}

export function roleFromSlug(slug: string): UserRole | null {
  const normalizedSlug = slug.toLowerCase();
  const entry = Object.entries(roleSlugAliases).find(([, aliases]) => aliases.includes(normalizedSlug));
  return entry ? (entry[0] as UserRole) : null;
}

export function getDefaultDashboardPath(role: UserRole): string {
  return `/portal/${roleSlugMap[role]}`;
}
