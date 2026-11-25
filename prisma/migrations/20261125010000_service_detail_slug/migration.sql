-- Página de detalle (/servicios/[slug]) que enlaza cada servicio del sitio público.
ALTER TABLE "Service" ADD COLUMN "detailSlug" TEXT;

-- Conserva los enlaces que hoy se resolvían por el nombre exacto del servicio.
UPDATE "Service" SET "detailSlug" = 'limpieza-dental' WHERE "name" = 'Limpieza y profilaxis';
UPDATE "Service" SET "detailSlug" = 'ortodoncia' WHERE "name" = 'Ortodoncia digital';
UPDATE "Service" SET "detailSlug" = 'implantes' WHERE "name" = 'Implantes y cirugía';
UPDATE "Service" SET "detailSlug" = 'estetica-dental' WHERE "name" = 'Estética dental';
UPDATE "Service" SET "detailSlug" = 'endodoncia' WHERE "name" = 'Endodoncia avanzada';
UPDATE "Service" SET "detailSlug" = 'odontopediatria' WHERE "name" = 'Odontopediatría';
