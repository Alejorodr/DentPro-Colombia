import { requireRole } from "@/lib/auth/require-role";
import { AdminServicesPanel } from "@/app/portal/admin/services/AdminServicesPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminServicesPage() {
  await requireRole("ADMINISTRADOR");
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Services & Pricing"
        title="Catálogo de servicios"
        description="Administra precios, duración y estado de los servicios clínicos."
      />
      <AdminServicesPanel />
    </div>
  );
}
