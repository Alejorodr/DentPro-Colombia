import { requireRole } from "@/lib/auth/require-role";
import { AdminProfessionalsPanel } from "@/app/portal/admin/professionals/AdminProfessionalsPanel";

export default async function AdminProfessionalsPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Profesionales</p>
        <h1 className="text-2xl font-semibold text-slate-900">Perfiles clínicos</h1>
        <p className="text-sm text-slate-600">Crea y actualiza profesionales asociados a la clínica.</p>
      </header>
      <AdminProfessionalsPanel />
    </div>
  );
}
