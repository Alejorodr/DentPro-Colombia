import { requireRole } from "@/lib/auth/require-role";
import { AdminProfessionalsPanel } from "@/app/portal/admin/professionals/AdminProfessionalsPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminProfessionalsPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Profesionales"
        title="Perfiles clínicos"
        description="Crea y actualiza profesionales asociados a la clínica."
      />
      <AdminProfessionalsPanel />
    </div>
  );
}
