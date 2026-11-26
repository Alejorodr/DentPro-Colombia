import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { primaryKeyFor, rewriteEncryptedRows, type RewriteDelegate } from "../encrypt-existing";
import { ENCRYPTED_FIELDS } from "../prisma-field-encryption";

/** Campo marcado `@id` de cada modelo del esquema (los de clave compuesta `@@id` quedan sin entrada). */
function schemaPrimaryKeys(): Map<string, string> {
  const schema = readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const keys = new Map<string, string>();
  for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const idLine = match[2].split("\n").find((line) => /\s@id(\s|$)/.test(line));
    if (idLine) keys.set(match[1], idLine.trim().split(/\s+/)[0]);
  }
  return keys;
}

describe("encrypt-existing-fields", () => {
  // DOG-53: el script falló en producción porque UserMfa usa `userId` como clave y no `id`.
  it("conoce la clave primaria real de cada modelo cifrado", () => {
    const keys = schemaPrimaryKeys();
    for (const model of Object.keys(ENCRYPTED_FIELDS)) {
      expect(keys.has(model), `${model} no tiene un @id simple en el esquema`).toBe(true);
      expect(primaryKeyFor(model), model).toBe(keys.get(model));
    }
  });

  it("pagina y actualiza por la clave del modelo cuando no es id", async () => {
    const pages = [
      [
        { userId: "u1", secret: "s1" },
        { userId: "u2", secret: null },
      ],
      [{ userId: "u3", secret: "s3" }],
      [],
    ];
    const delegate: RewriteDelegate = {
      findMany: vi.fn(async () => pages.shift() ?? []),
      update: vi.fn(async () => undefined),
    };

    const rewritten = await rewriteEncryptedRows(delegate, "UserMfa", { secret: "text" }, 2);

    expect(rewritten).toBe(2);
    expect(delegate.findMany).toHaveBeenNthCalledWith(1, {
      select: { userId: true, secret: true },
      orderBy: { userId: "asc" },
      take: 2,
    });
    expect(delegate.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: { userId: "u2" }, skip: 1 }));
    expect(delegate.update).toHaveBeenCalledWith({ where: { userId: "u1" }, data: { secret: "s1" } });
    expect(delegate.update).toHaveBeenCalledWith({ where: { userId: "u3" }, data: { secret: "s3" } });
    expect(delegate.update).toHaveBeenCalledTimes(2);
  });

  it("usa id para los modelos sin clave especial", () => {
    expect(primaryKeyFor("PatientProfile")).toBe("id");
  });
});
