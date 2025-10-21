export const userRoles = ["patient", "professional", "reception", "admin"] as const;

export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  patient: "Paciente",
  professional: "Profesional",
  reception: "Recepción",
  admin: "Administrador",
};

export function isUserRole(role: string): role is UserRole {
  return (userRoles as readonly string[]).includes(role);
}

export function getDefaultDashboardPath(role: UserRole): string {
  return `/${role}`;
}

