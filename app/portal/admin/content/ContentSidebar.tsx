"use client";

type SidebarGroup = {
  label: string;
  items: Array<{ slug: string; label: string; description: string }>;
};

const GROUPS: SidebarGroup[] = [
  {
    label: "Marca / Header",
    items: [
      { slug: "identidad", label: "Identidad de marca", description: "Nombre de la empresa, logo, dirección y horario." },
      { slug: "seo", label: "SEO y metadatos", description: "Título y descripción para buscadores." },
      { slug: "navbar", label: "Navbar", description: "Enlaces del menú de navegación superior." },
    ],
  },
  {
    label: "Hero",
    items: [
      { slug: "hero-stats", label: "Estadísticas hero", description: "Contadores debajo de los botones principales." },
      {
        slug: "hero-copy",
        label: "Textos del hero",
        description: "Título, descripción, botones, testimonio e imagen principal.",
      },
    ],
  },
  {
    label: "Servicios",
    items: [
      {
        slug: "servicios-copy",
        label: "Encabezado de servicios",
        description: "Título y descripción de la sección \"¿Qué hacemos?\".",
      },
    ],
  },
  {
    label: "Equipo",
    items: [
      {
        slug: "especialistas-copy",
        label: "Encabezado del equipo",
        description: "Badge, título y descripción del bloque de especialistas.",
      },
    ],
  },
  {
    label: "Agenda",
    items: [
      { slug: "booking", label: "Opciones de agendamiento", description: "Métodos disponibles para agendar." },
      { slug: "benefits", label: "Beneficios de agendar", description: "Textos debajo del formulario de agenda." },
      {
        slug: "agenda-copy",
        label: "Textos de agenda",
        description: "Título, descripción y notas del formulario de agendamiento.",
      },
    ],
  },
  {
    label: "FAQ",
    items: [
      { slug: "faq", label: "Preguntas frecuentes", description: "Preguntas y respuestas + SEO estructurado." },
    ],
  },
  {
    label: "Contacto / Footer",
    items: [
      { slug: "support", label: "Canales de soporte", description: "Íconos de contacto rápido." },
      { slug: "locations", label: "Sedes / ubicaciones", description: "Tarjetas de sede con dirección y horario." },
      { slug: "legal", label: "Enlaces legales", description: "Política de privacidad, términos, etc." },
      { slug: "floating", label: "Botones flotantes", description: "WhatsApp y teléfono flotantes." },
      {
        slug: "contacto-copy",
        label: "Textos de contacto",
        description: "Título y descripción del bloque de contacto.",
      },
    ],
  },
  {
    label: "Redes",
    items: [
      { slug: "social", label: "Redes sociales", description: "Íconos que enlazan a Instagram, Facebook, etc." },
    ],
  },
  {
    label: "Marketing",
    items: [
      { slug: "campaigns", label: "Campañas", description: "Banners promocionales con fecha de inicio y fin." },
    ],
  },
];

export function ContentSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <nav aria-label="Secciones del CMS" className="space-y-5 lg:sticky lg:top-6 lg:self-start">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
          <div className="mt-1 space-y-1">
            {group.items.map((item) => {
              const isActive = activeSection === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => onSelect(item.slug)}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 ${
                    isActive
                      ? "bg-brand-light font-semibold text-brand-teal dark:bg-brand-teal/20 dark:text-accent-cyan"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-surface-muted/20"
                  }`}
                >
                  <span className="block">{item.label}</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-400 dark:text-slate-500">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function findSectionLabel(slug: string): string {
  for (const group of GROUPS) {
    const match = group.items.find((item) => item.slug === slug);
    if (match) return match.label;
  }
  return slug;
}

export const DEFAULT_SECTION = "identidad";
