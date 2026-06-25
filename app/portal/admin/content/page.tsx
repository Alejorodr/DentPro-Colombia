import { requireRole } from "@/lib/auth/require-role";
import { AdminBootstrapButton } from "@/app/portal/admin/content/AdminBootstrapButton";
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
import { AdminHomepageFaqPanel } from "@/app/portal/admin/content/AdminHomepageFaqPanel";

const NAV_ITEMS = [
  { label: "Textos y logo", href: "#settings" },
  { label: "Estadísticas hero", href: "#hero-stats" },
  { label: "Servicios", href: "#services" },
  { label: "Especialistas", href: "#specialists" },
  { label: "Agenda", href: "#booking" },
  { label: "Beneficios", href: "#benefits" },
  { label: "Redes sociales", href: "#social" },
  { label: "Soporte", href: "#support" },
  { label: "Sedes", href: "#locations" },
  { label: "Legales", href: "#legal" },
  { label: "FAQ", href: "#faq" },
  { label: "Campañas", href: "#campaigns" },
];

export default async function AdminContentPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-8">
      {/* Page header */}
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

      {/* Quick nav */}
      <nav aria-label="Secciones del CMS">
        <div className="flex flex-wrap gap-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted dark:bg-surface-elevated dark:text-slate-300 dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Sections */}
      <section id="settings" aria-labelledby="settings-heading" className="scroll-mt-20 space-y-4">
        <h2 id="settings-heading" className="sr-only">Textos, logo e imágenes</h2>
        <AdminHomepageSettingsPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="hero-stats" aria-labelledby="hero-stats-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hero</p>
          <h2 id="hero-stats-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Estadísticas del hero
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los contadores que aparecen debajo de los botones principales (ej: "3,200+ Sonrisas transformadas").
          </p>
        </div>
        <AdminHomepageHeroStatsPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="services" aria-labelledby="services-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Servicios</p>
          <h2 id="services-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Catálogo de servicios
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Las tarjetas de servicios que aparecen en la sección "¿Qué hacemos?" del homepage.
          </p>
        </div>
        <AdminHomepageServicesPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="specialists" aria-labelledby="specialists-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Equipo</p>
          <h2 id="specialists-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Especialistas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Las tarjetas del equipo clínico. Sube la foto de cada especialista directamente desde tu equipo.
          </p>
        </div>
        <AdminHomepageSpecialistsPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="booking" aria-labelledby="booking-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agenda</p>
          <h2 id="booking-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Opciones de agendamiento
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los métodos disponibles para que los pacientes agenden su cita (WhatsApp, teléfono, formulario, etc.).
          </p>
        </div>
        <AdminHomepageBookingOptionsPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="benefits" aria-labelledby="benefits-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agenda</p>
          <h2 id="benefits-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Beneficios de agendar
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los íconos y textos que explican por qué agendar con la clínica (sección debajo del formulario).
          </p>
        </div>
        <AdminHomepageBookingBenefitsPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="social" aria-labelledby="social-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Redes</p>
          <h2 id="social-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Redes sociales
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los íconos del footer que enlazan a Facebook, Instagram, TikTok, etc.
          </p>
        </div>
        <AdminHomepageSocialLinksPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="support" aria-labelledby="support-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contacto</p>
          <h2 id="support-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Canales de soporte
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los íconos de contacto rápido (teléfono, WhatsApp, email) que aparecen en la sección de contacto.
          </p>
        </div>
        <AdminHomepageContactSupportItemsPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="locations" aria-labelledby="locations-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contacto</p>
          <h2 id="locations-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Sedes / ubicaciones
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Las tarjetas de sede con dirección, horario y enlace al mapa.
          </p>
        </div>
        <AdminHomepageLocationsPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="legal" aria-labelledby="legal-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Footer</p>
          <h2 id="legal-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Enlaces legales
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Los enlaces del footer: Política de privacidad, Términos y condiciones, etc.
          </p>
        </div>
        <AdminHomepageLegalLinksPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">FAQ</p>
          <h2 id="faq-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Preguntas frecuentes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Las preguntas y respuestas que aparecen en la sección FAQ del homepage. También se usan para el SEO estructurado (schema.org FAQPage).
          </p>
        </div>
        <AdminHomepageFaqPanel />
      </section>

      <div className="border-t border-slate-200 dark:border-surface-muted" />

      <section id="campaigns" aria-labelledby="campaigns-heading" className="scroll-mt-20 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Marketing</p>
          <h2 id="campaigns-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
            Campañas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Banners promocionales con fecha de inicio y fin que aparecen en el homepage.
          </p>
        </div>
        <AdminCampaignsPanel />
      </section>
    </div>
  );
}
