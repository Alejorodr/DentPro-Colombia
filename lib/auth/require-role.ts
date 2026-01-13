import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultDashboardPath, isUserRole, type UserRole } from "@/lib/auth/roles";

export async function requireRole(allowedRoles: UserRole | UserRole[]) {
  const session = await auth();
  const role = session?.user?.role;
  const normalizedRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!role || !isUserRole(role)) {
    redirect("/login");
  }

  if (!normalizedRoles.includes(role)) {
    redirect(getDefaultDashboardPath(role));
  }

  return session;
}
