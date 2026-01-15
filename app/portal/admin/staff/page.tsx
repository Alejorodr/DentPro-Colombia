import { requireRole } from "@/lib/auth/require-role";
import { AdminProfessionalsPanel } from "@/app/portal/admin/professionals/AdminProfessionalsPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminStaffPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Staff Management"
        title="Equipo clínico"
        description="Administra profesionales, disponibilidad y perfiles en un solo lugar."
      />
      <AdminProfessionalsPanel />
    </div>
  );
}
