import { requireRole } from "@/lib/auth/require-role";
import { AdminAppointmentsPanel } from "@/app/portal/admin/appointments/AdminAppointmentsPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminAppointmentsPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Turnos y citas"
        title="Agenda completa"
        description="Consulta el estado de la agenda y prioriza pendientes."
      />
      <AdminAppointmentsPanel />
    </div>
  );
}
