import { requireRole } from "@/lib/auth/require-role";
import { AdminSpecialtiesPanel } from "@/app/portal/admin/specialties/AdminSpecialtiesPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminSpecialtiesPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Especialidades"
        title="Oferta clínica"
        description="Gestiona la oferta clínica y la duración base de turnos."
      />
      <AdminSpecialtiesPanel />
    </div>
  );
}
