import { notFound, redirect } from "next/navigation";

import { getDefaultDashboardPath, roleFromSlug } from "@/lib/auth/roles";

/**
 * Alias de rol en español o inglés (/portal/paciente, /portal/administrador...). Las rutas
 * canónicas (/portal/client, /portal/admin...) son carpetas propias y tienen prioridad; aquí
 * solo se redirige al portal real del rol, que ya aplica su propia guarda de sesión.
 */
export default async function PortalRoleAliasPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const requestedRole = roleFromSlug(role);

  if (!requestedRole) {
    notFound();
  }

  redirect(getDefaultDashboardPath(requestedRole));
}
