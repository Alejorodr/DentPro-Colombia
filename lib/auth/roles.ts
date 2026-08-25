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
  ADMINISTRADOR: ["admin", "administrador", "administrator"],
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
  if (role === "RECEPCIONISTA") {
    return "/portal/receptionist/dashboard";
  }

  return `/portal/${roleSlugMap[role]}`;
}

// Authenticated destinations that live outside every role root but are still legitimate
// post-login landing spots. `/appointments/new` is linked from the public homepage with
// `?professionalId=…`; without this allowlist the callback is discarded and the visitor
// lands on their dashboard with the preselection lost.
const sharedPostLoginPaths = ["/appointments/new"];

export function resolveRoleAwarePortalPath(role: UserRole, candidate?: string | null): string {
  const fallback = getDefaultDashboardPath(role);

  if (!candidate) {
    return fallback;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return fallback;
  }

  let path = trimmed;
  if (trimmed.startsWith("http")) {
    try {
      const parsed = new URL(trimmed);
      path = `${parsed.pathname}${parsed.search}`;
    } catch {
      return fallback;
    }
  }

  if (!path.startsWith("/") || path === "/" || path.startsWith("/auth/login") || path.startsWith("/login")) {
    return fallback;
  }

  const pathnameOnly = path.split("?")[0];
  if (sharedPostLoginPaths.includes(pathnameOnly)) {
    return path;
  }

  const roleRoot = `/portal/${roleSlugMap[role]}`;
  if (path === roleRoot || path.startsWith(`${roleRoot}/`)) {
    return path;
  }

  return fallback;
}
