/**
 * URL pública del sitio para canonical, sitemap, robots, Open Graph y JSON-LD.
 * En Vercel debe venir de NEXT_PUBLIC_SITE_URL; el valor por defecto es el dominio
 * de producción que sí existe, para no anunciar a buscadores un dominio ajeno.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dent-pro-colombia.vercel.app").replace(/\/+$/, "");
