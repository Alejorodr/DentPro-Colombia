import { revalidateTag } from "next/cache";

/**
 * DOG-14: caché de catálogos que cambian poco (contenido del home, servicios y
 * especialidades). Usa la caché de datos de Next (`unstable_cache`), que en Vercel
 * es compartida entre instancias; por eso no hace falta Redis.
 *
 * Las entradas sobreviven a un deploy nuevo: si cambia la forma de los datos
 * cacheados, sube CATALOG_CACHE_VERSION para no servir el formato viejo.
 */
export const CATALOG_CACHE_VERSION = "v1";

export const CATALOG_TAGS = {
  homepage: "catalog:homepage",
  services: "catalog:services",
  specialties: "catalog:specialties",
} as const;

export type CatalogTag = (typeof CATALOG_TAGS)[keyof typeof CATALOG_TAGS];

/** Red de seguridad: aunque falle una invalidación, nada queda viejo más de 5 minutos. */
export const CATALOG_REVALIDATE_SECONDS = 300;

/** Qué catálogos se invalidan al escribir en cada modelo de Prisma. */
const MODEL_TAGS: Record<string, readonly CatalogTag[]> = {
  Service: [CATALOG_TAGS.services, CATALOG_TAGS.homepage],
  ServiceHighlight: [CATALOG_TAGS.homepage],
  Specialty: [CATALOG_TAGS.specialties, CATALOG_TAGS.homepage],
  ProfessionalProfile: [CATALOG_TAGS.homepage],
  Campaign: [CATALOG_TAGS.homepage],
};

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

export function catalogTagsForWrite(model: string | undefined, operation: string): readonly CatalogTag[] {
  if (!model || !WRITE_OPERATIONS.has(operation)) return [];
  if (model.startsWith("Homepage")) return [CATALOG_TAGS.homepage];
  return MODEL_TAGS[model] ?? [];
}

/**
 * Marca los catálogos como vencidos para que el siguiente request los lea de la base.
 * Fuera de un request de Next (scripts, seeds, tests) `revalidateTag` lanza error:
 * ahí no hay caché que invalidar, así que se ignora y el TTL hace el resto.
 */
export function invalidateCatalogTags(tags: readonly CatalogTag[]) {
  for (const tag of tags) {
    try {
      // expire 0: quien acaba de editar desde el admin ve el cambio en la siguiente carga.
      revalidateTag(tag, { expire: 0 });
    } catch {
      /* fuera de un request de Next */
    }
  }
}
