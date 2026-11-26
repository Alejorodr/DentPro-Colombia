/**
 * Cifra los datos sensibles que quedaron en claro antes de DOG-18, y re-cifra con la
 * clave actual después de una rotación. Es idempotente: se puede correr varias veces.
 *
 *   pnpm dlx tsx scripts/security/encrypt-existing-fields.ts           # solo cuenta
 *   pnpm dlx tsx scripts/security/encrypt-existing-fields.ts --apply   # cifra
 *
 * Necesita DATABASE_URL, FIELD_ENCRYPTION_KEY (+ _KEY_ID) y FIELD_HASH_KEY del entorno
 * que se quiere migrar. Cada fila se lee a través del cliente (que descifra lo que ya
 * esté cifrado) y se vuelve a escribir (que cifra con la clave actual y calcula el hash).
 */
import { Prisma } from "@prisma/client";

import { getPrismaClient } from "../../lib/prisma";
import { rewriteEncryptedRows, type RewriteDelegate } from "../../lib/security/encrypt-existing";
import { isFieldEncryptionEnabled } from "../../lib/security/field-encryption";
import { ENCRYPTED_FIELDS } from "../../lib/security/prisma-field-encryption";

function delegateFor(model: string): RewriteDelegate {
  const prisma = getPrismaClient() as unknown as Record<string, RewriteDelegate>;
  return prisma[model.charAt(0).toLowerCase() + model.slice(1)];
}

/** Filas con algún campo en claro. Los identificadores salen de ENCRYPTED_FIELDS, no del usuario. */
async function countPlaintext(model: string, fields: Record<string, "text" | "json">) {
  const conditions = Object.entries(fields).map(([field, kind]) =>
    kind === "json"
      ? `("${field}" IS NOT NULL AND "${field}"::text NOT LIKE '"encj:%')`
      : `("${field}" IS NOT NULL AND "${field}" NOT LIKE 'enc:%')`,
  );
  const rows = await getPrismaClient().$queryRaw<Array<{ total: bigint }>>(
    Prisma.sql`SELECT COUNT(*)::bigint AS total FROM ${Prisma.raw(`"${model}"`)} WHERE ${Prisma.raw(conditions.join(" OR "))}`,
  );
  return Number(rows[0]?.total ?? 0);
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (apply && (!isFieldEncryptionEnabled() || !process.env.FIELD_HASH_KEY)) {
    throw new Error("Faltan FIELD_ENCRYPTION_KEY o FIELD_HASH_KEY: sin ellas no se cifraría nada.");
  }

  for (const [model, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    const pending = await countPlaintext(model, fields);
    if (!apply) {
      console.log(`${model}: ${pending} filas con datos en claro`);
      continue;
    }
    const rewritten = await rewriteEncryptedRows(delegateFor(model), model, fields);
    const left = await countPlaintext(model, fields);
    console.log(`${model}: ${rewritten} filas reescritas, ${left} en claro`);
    if (left > 0) process.exitCode = 1;
  }

  if (!apply) console.log("\nModo conteo. Agrega --apply para cifrar.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrismaClient().$disconnect();
  });
