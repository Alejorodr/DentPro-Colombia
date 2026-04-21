import { requireRole } from "@/lib/auth/require-role";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";
import { AdminCampaignsPanel } from "@/app/portal/admin/content/AdminCampaignsPanel";
import { AdminHomepageSettingsPanel } from "@/app/portal/admin/content/AdminHomepageSettingsPanel";
import { AdminHomepageServicesPanel } from "@/app/portal/admin/content/AdminHomepageServicesPanel";
import { AdminHomepageSpecialistsPanel } from "@/app/portal/admin/content/AdminHomepageSpecialistsPanel";

export default async function AdminContentPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="CMS"
        title="Contenido del sitio"
        description="Configura campañas y promociones para el portal de marketing."
      />
      <AdminHomepageSettingsPanel />
      <AdminHomepageServicesPanel />
      <AdminHomepageSpecialistsPanel />
      <AdminCampaignsPanel />
    </div>
  );
}
