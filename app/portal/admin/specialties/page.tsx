import { requireRole } from "@/lib/auth/require-role";
import { AdminSpecialtiesPanel } from "@/app/portal/admin/specialties/AdminSpecialtiesPanel";

export default async function AdminSpecialtiesPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Especialidades</p>
        <h1 className="text-2xl font-semibold text-slate-900">Catálogo clínico</h1>
        <p className="text-sm text-slate-600">Define las especialidades y la duración base de sus turnos.</p>
      </header>
      <AdminSpecialtiesPanel />
    </div>
  );
}
