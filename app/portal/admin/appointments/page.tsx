import { requireRole } from "@/lib/auth/require-role";
import { AdminAppointmentsPanel } from "@/app/portal/admin/appointments/AdminAppointmentsPanel";

export default async function AdminAppointmentsPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Citas</p>
        <h1 className="text-2xl font-semibold text-slate-900">Agenda clínica</h1>
        <p className="text-sm text-slate-600">Consulta todas las citas registradas.</p>
      </header>
      <AdminAppointmentsPanel />
    </div>
  );
}
