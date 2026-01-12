import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistPanel } from "@/app/portal/receptionist/ReceptionistPanel";

export default async function ReceptionistPortalPage() {
  await requireRole("RECEPCIONISTA");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Portal Recepción</p>
        <h1 className="text-2xl font-semibold text-slate-900">Agenda general</h1>
        <p className="text-sm text-slate-600">Gestiona pacientes y citas desde recepción.</p>
      </header>
      <ReceptionistPanel />
    </div>
  );
}
