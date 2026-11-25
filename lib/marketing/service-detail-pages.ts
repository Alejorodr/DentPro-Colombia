/**
 * Páginas de detalle que existen en /servicios/[slug]. Lista liviana (sin el contenido)
 * para poder usarla en el CMS y en la validación de la API sin cargar services-data.
 * Debe coincidir con los slugs de SERVICES (lo verifica un test).
 */
export const SERVICE_DETAIL_PAGES = [
  { slug: "limpieza-dental", label: "Limpieza y profilaxis" },
  { slug: "ortodoncia", label: "Ortodoncia digital" },
  { slug: "implantes", label: "Implantes dentales" },
  { slug: "estetica-dental", label: "Estética dental" },
  { slug: "endodoncia", label: "Endodoncia avanzada" },
  { slug: "odontopediatria", label: "Odontopediatría" },
] as const;

export type ServiceDetailSlug = (typeof SERVICE_DETAIL_PAGES)[number]["slug"];

export const SERVICE_DETAIL_SLUGS = SERVICE_DETAIL_PAGES.map((page) => page.slug) as [
  ServiceDetailSlug,
  ...ServiceDetailSlug[],
];

/** Ruta de la página de detalle, o null si el slug no corresponde a una página existente. */
export function serviceDetailHref(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return (SERVICE_DETAIL_SLUGS as readonly string[]).includes(slug) ? `/servicios/${slug}` : null;
}
