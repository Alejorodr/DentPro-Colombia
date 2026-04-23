import { requireRole } from "@/lib/auth/require-role";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";
import { AdminCampaignsPanel } from "@/app/portal/admin/content/AdminCampaignsPanel";
import { AdminHomepageSettingsPanel } from "@/app/portal/admin/content/AdminHomepageSettingsPanel";
import { AdminHomepageHeroStatsPanel } from "@/app/portal/admin/content/AdminHomepageHeroStatsPanel";
import { AdminHomepageServicesPanel } from "@/app/portal/admin/content/AdminHomepageServicesPanel";
import { AdminHomepageSpecialistsPanel } from "@/app/portal/admin/content/AdminHomepageSpecialistsPanel";
import { AdminHomepageBookingOptionsPanel } from "@/app/portal/admin/content/AdminHomepageBookingOptionsPanel";
import { AdminHomepageBookingBenefitsPanel } from "@/app/portal/admin/content/AdminHomepageBookingBenefitsPanel";
import { AdminHomepageSocialLinksPanel } from "@/app/portal/admin/content/AdminHomepageSocialLinksPanel";
import { AdminHomepageContactSupportItemsPanel } from "@/app/portal/admin/content/AdminHomepageContactSupportItemsPanel";
import { AdminHomepageLocationsPanel } from "@/app/portal/admin/content/AdminHomepageLocationsPanel";
import { AdminHomepageLegalLinksPanel } from "@/app/portal/admin/content/AdminHomepageLegalLinksPanel";

export default async function AdminContentPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="CMS"
        title="Contenido del sitio"
        description="Administra campañas y todo el CMS del homepage: settings, hero stats, servicios, especialistas, agenda, beneficios, enlaces, soporte, sedes y legales."
      />
      <AdminHomepageSettingsPanel />
      <AdminHomepageHeroStatsPanel />
      <AdminHomepageServicesPanel />
      <AdminHomepageSpecialistsPanel />
      <AdminHomepageBookingOptionsPanel />
      <AdminHomepageBookingBenefitsPanel />
      <AdminHomepageSocialLinksPanel />
      <AdminHomepageContactSupportItemsPanel />
      <AdminHomepageLocationsPanel />
      <AdminHomepageLegalLinksPanel />
      <AdminCampaignsPanel />
    </div>
  );
}
