import { requireRole } from "@/lib/auth/require-role";
import { AdminUsersPanel } from "@/app/portal/admin/users/AdminUsersPanel";

export default async function AdminUsersPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Usuarios</p>
        <h1 className="text-2xl font-semibold text-slate-900">Gestión de usuarios</h1>
        <p className="text-sm text-slate-600">Crea cuentas y asigna roles desde un solo panel.</p>
      </header>
      <AdminUsersPanel />
    </div>
  );
}
