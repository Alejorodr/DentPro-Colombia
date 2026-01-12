import { requireRole } from "@/lib/auth/require-role";
import { ProfessionalAppointments } from "@/app/portal/professional/ProfessionalAppointments";

export default async function ProfessionalPortalPage() {
  await requireRole("PROFESIONAL");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Portal Profesional</p>
        <h1 className="text-2xl font-semibold text-slate-900">Mi agenda</h1>
        <p className="text-sm text-slate-600">Revisa tus citas asignadas y su estado.</p>
      </header>
      <ProfessionalAppointments />
    </div>
  );
}
