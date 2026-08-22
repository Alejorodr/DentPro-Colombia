"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminBootstrapButton } from "@/app/portal/admin/content/AdminBootstrapButton";
import { AdminCampaignsPanel } from "@/app/portal/admin/content/AdminCampaignsPanel";
import { AdminHomepageSettingsPanel } from "@/app/portal/admin/content/AdminHomepageSettingsPanel";
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

function SectionPanel({ section }: { section: string }) {
  switch (section) {
    case "settings":
      return <AdminHomepageSettingsPanel />;
    case "infobar":
      return <AdminHomepageSettingsPanel openSlug="info-superior" />;
    case "floating":
      return <AdminHomepageSettingsPanel openSlug="acciones-flotantes" />;
    case "identidad":
      return <AdminHomepageSettingsPanel openSlug="identidad" />;
    case "seo":
      return <AdminHomepageSettingsPanel openSlug="seo" />;
    case "hero-copy":
      return <AdminHomepageSettingsPanel openSlug="hero" />;
    case "servicios-copy":
      return <AdminHomepageSettingsPanel openSlug="servicios" />;
    case "especialistas-copy":
      return <AdminHomepageSettingsPanel openSlug="especialistas" />;
    case "agenda-copy":
      return <AdminHomepageSettingsPanel openSlug="agenda" />;
    case "contacto-copy":
      return <AdminHomepageSettingsPanel openSlug="contacto" />;
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
      return <AdminHomepageSettingsPanel />;
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
