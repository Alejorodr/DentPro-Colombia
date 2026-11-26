import { ENCRYPTED_FIELDS } from "./prisma-field-encryption";

/**
 * Lógica del script `scripts/security/encrypt-existing-fields.ts` que no toca la base directamente,
 * separada para poder probarla (DOG-53).
 */

export type RewriteDelegate = {
  findMany(args: unknown): Promise<Array<Record<string, unknown>>>;
  update(args: unknown): Promise<unknown>;
};

type FieldKinds = (typeof ENCRYPTED_FIELDS)[string];

/** Clave primaria de cada modelo cifrado cuando no se llama `id` (UserMfa usa `userId`, DOG-28). */
const PRIMARY_KEYS: Record<string, string> = { UserMfa: "userId" };

export function primaryKeyFor(model: string): string {
  return PRIMARY_KEYS[model] ?? "id";
}

/**
 * Lee las filas por lotes ordenadas por su clave primaria y reescribe las que tienen algún campo
 * cifrable. El cliente de Prisma descifra al leer y cifra al escribir, así que reescribir basta.
 */
export async function rewriteEncryptedRows(
  delegate: RewriteDelegate,
  model: string,
  fields: FieldKinds,
  batchSize = 200,
): Promise<number> {
  const pk = primaryKeyFor(model);
  const select = Object.fromEntries([[pk, true], ...Object.keys(fields).map((field) => [field, true])]);
  let cursor: string | undefined;
  let rewritten = 0;

  for (;;) {
    const rows = await delegate.findMany({
      select,
      orderBy: { [pk]: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { [pk]: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      const data = Object.fromEntries(
        Object.keys(fields)
          .filter((field) => row[field] != null)
          .map((field) => [field, row[field]]),
      );
      if (Object.keys(data).length > 0) {
        await delegate.update({ where: { [pk]: row[pk] }, data });
        rewritten += 1;
      }
    }
    cursor = rows[rows.length - 1]?.[pk] as string;
  }
  return rewritten;
}
