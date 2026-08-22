"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminBootstrapButton } from "@/app/portal/admin/content/AdminBootstrapButton";
import { AdminCampaignsPanel } from "@/app/portal/admin/content/AdminCampaignsPanel";
import { AdminCompanyInfoPanel } from "@/app/portal/admin/content/AdminCompanyInfoPanel";
import { AdminHomepageChannelsPanel } from "@/app/portal/admin/content/AdminHomepageChannelsPanel";
import { AdminHeroPanel } from "@/app/portal/admin/content/AdminHeroPanel";
import { AdminServicesCopyPanel } from "@/app/portal/admin/content/AdminServicesCopyPanel";
import { AdminSpecialistsCopyPanel } from "@/app/portal/admin/content/AdminSpecialistsCopyPanel";
import { AdminAgendaCopyPanel } from "@/app/portal/admin/content/AdminAgendaCopyPanel";
import { AdminContactCopyPanel } from "@/app/portal/admin/content/AdminContactCopyPanel";
import { AdminSeoPanel } from "@/app/portal/admin/content/AdminSeoPanel";
import { AdminHomepageHeroStatsPanel } from "@/app/portal/admin/content/AdminHomepageHeroStatsPanel";
import { AdminHomepageBookingOptionsPanel } from "@/app/portal/admin/content/AdminHomepageBookingOptionsPanel";
import { AdminHomepageBookingBenefitsPanel } from "@/app/portal/admin/content/AdminHomepageBookingBenefitsPanel";
import { AdminHomepageSocialLinksPanel } from "@/app/portal/admin/content/AdminHomepageSocialLinksPanel";
import { AdminHomepageContactSupportItemsPanel } from "@/app/portal/admin/content/AdminHomepageContactSupportItemsPanel";
import { AdminHomepageLocationsPanel } from "@/app/portal/admin/content/AdminHomepageLocationsPanel";
import { AdminHomepageLegalLinksPanel } from "@/app/portal/admin/content/AdminHomepageLegalLinksPanel";
import { AdminHomepageFaqPanel } from "@/app/portal/admin/content/AdminHomepageFaqPanel";
import { AdminHomepageNavLinksPanel } from "@/app/portal/admin/content/AdminHomepageNavLinksPanel";
import { ContentSidebar, DEFAULT_SECTION, findSectionLabel } from "@/app/portal/admin/content/ContentSidebar";

// NOTE: this switch is an interim "unbreak" patch (same pattern as Tasks 16/20) after
// AdminHomepageSettingsPanel was split into 5 dedicated panels (Task 21) + a 6th
// (AdminSpecialistsCopyPanel) added to cover the "especialistas" gap. "identidad" now
// routes to AdminCompanyInfoPanel and the old "infobar" sidebar entry was dropped as a
// duplicate of it; "floating" now routes to AdminHomepageChannelsPanel, which already
// manages WhatsApp/phone/email placement (incl. the floating buttons). The full sidebar
// regrouping (new group labels, "company-info"/"channels" slugs, etc.) is still Task 22
// — this patch only makes every slug point at a real, non-deleted component so the
// build is green.
function SectionPanel({ section }: { section: string }) {
  switch (section) {
    case "identidad":
      return <AdminCompanyInfoPanel />;
    case "floating":
      return <AdminHomepageChannelsPanel />;
    case "seo":
      return <AdminSeoPanel />;
    case "hero-copy":
      return <AdminHeroPanel />;
    case "servicios-copy":
      return <AdminServicesCopyPanel />;
    case "especialistas-copy":
      return <AdminSpecialistsCopyPanel />;
    case "agenda-copy":
      return <AdminAgendaCopyPanel />;
    case "contacto-copy":
      return <AdminContactCopyPanel />;
    case "navbar":
      return <AdminHomepageNavLinksPanel />;
    case "hero-stats":
      return <AdminHomepageHeroStatsPanel />;
    case "booking":
      return <AdminHomepageBookingOptionsPanel />;
    case "benefits":
      return <AdminHomepageBookingBenefitsPanel />;
    case "social":
      return <AdminHomepageSocialLinksPanel />;
    case "support":
      return <AdminHomepageContactSupportItemsPanel />;
    case "locations":
      return <AdminHomepageLocationsPanel />;
    case "legal":
      return <AdminHomepageLegalLinksPanel />;
    case "faq":
      return <AdminHomepageFaqPanel />;
    case "campaigns":
      return <AdminCampaignsPanel />;
    default:
      return <AdminCompanyInfoPanel />;
  }
}

function ContentShellInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") ?? DEFAULT_SECTION;

  const selectSection = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", slug);
    router.replace(`/portal/admin/content?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
            Administración de contenido
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sitio público</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Todo lo que edites aquí se refleja en el homepage público de la clínica.
          </p>
        </div>
        <AdminBootstrapButton />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ContentSidebar activeSection={activeSection} onSelect={selectSection} />

        <div className="min-w-0 space-y-4">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-400">
            Contenido <span aria-hidden>›</span> <span className="text-slate-600 dark:text-slate-300">{findSectionLabel(activeSection)}</span>
          </nav>
          <SectionPanel key={activeSection} section={activeSection} />
        </div>
      </div>
    </div>
  );
}

export function ContentShell() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}>
      <ContentShellInner />
    </Suspense>
  );
}
