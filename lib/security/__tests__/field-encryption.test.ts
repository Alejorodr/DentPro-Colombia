import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetFieldEncryptionForTests,
  decryptValue,
  documentIdSearchHash,
  encryptJson,
  encryptText,
  isEncryptedValue,
} from "@/lib/security/field-encryption";
import { decryptResult, encryptWriteArgs } from "@/lib/security/prisma-field-encryption";

const key = () => randomBytes(32).toString("base64");

function useKeys(env: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value as string);
  __resetFieldEncryptionForTests();
}

beforeEach(() => {
  useKeys({ FIELD_ENCRYPTION_KEY: key(), FIELD_ENCRYPTION_KEY_ID: "k1", FIELD_HASH_KEY: key() });
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetFieldEncryptionForTests();
});

describe("field-encryption", () => {
  it("cifra y descifra texto, con IV distinto en cada llamada", () => {
    const first = encryptText("Alergia a la penicilina");
    const second = encryptText("Alergia a la penicilina");
    expect(first).toMatch(/^enc:v1:k1:/);
    expect(first).not.toBe(second);
    expect(first).not.toContain("penicilina");
    expect(decryptValue(first)).toBe("Alergia a la penicilina");
  });

  it("cifra JSON y lo devuelve parseado", () => {
    const sealed = encryptJson({ items: [{ name: "Ibuprofeno" }] });
    expect(isEncryptedValue(sealed)).toBe(true);
    expect(decryptValue(sealed)).toEqual({ items: [{ name: "Ibuprofeno" }] });
  });

  it("deja pasar los valores en claro (filas anteriores a la migración)", () => {
    expect(decryptValue("texto viejo")).toBe("texto viejo");
    expect(decryptValue(42)).toBe(42);
  });

  it("no vuelve a cifrar un valor ya cifrado", () => {
    const sealed = encryptText("x");
    expect(encryptText(sealed)).toBe(sealed);
  });

  it("sin clave configurada no cifra (modo transición)", () => {
    useKeys({ FIELD_ENCRYPTION_KEY: "" });
    expect(encryptText("hola")).toBe("hola");
  });

  it("descifra con una clave anterior después de rotar", () => {
    const oldKey = key();
    useKeys({ FIELD_ENCRYPTION_KEY: oldKey, FIELD_ENCRYPTION_KEY_ID: "k0" });
    const sealed = encryptText("dato");
    useKeys({ FIELD_ENCRYPTION_KEY: key(), FIELD_ENCRYPTION_KEY_ID: "k1", FIELD_ENCRYPTION_PREVIOUS_KEYS: `k0:${oldKey}` });
    expect(decryptValue(sealed)).toBe("dato");
    expect(encryptText("nuevo")).toMatch(/^enc:v1:k1:/);
  });

  it("falla si el texto cifrado fue alterado", () => {
    const sealed = encryptText("dato");
    // Se altera un byte real del ciphertext. Cambiar caracteres del base64 a ciegas era
    // intermitente: el último carácter lleva bits de relleno y a veces no cambiaba nada.
    const parts = sealed.split(":");
    const ciphertext = Buffer.from(parts[parts.length - 1], "base64url");
    ciphertext[0] ^= 0x01;
    parts[parts.length - 1] = ciphertext.toString("base64url");
    expect(() => decryptValue(parts.join(":"))).toThrow();
  });

  it("falla con un mensaje claro si falta la clave del valor", () => {
    const sealed = encryptText("dato");
    useKeys({ FIELD_ENCRYPTION_KEY: key(), FIELD_ENCRYPTION_KEY_ID: "k9" });
    expect(() => decryptValue(sealed)).toThrow(/k1/);
  });

  it("rechaza claves que no miden 32 bytes", () => {
    useKeys({ FIELD_ENCRYPTION_KEY: Buffer.from("corta").toString("base64") });
    expect(() => encryptText("x")).toThrow(/32 bytes/);
  });

  it("el hash de búsqueda ignora puntos, espacios y guiones", () => {
    expect(documentIdSearchHash("1.020.304-5")).toBe(documentIdSearchHash("10203045"));
    expect(documentIdSearchHash("10203045")).toMatch(/^[0-9a-f]{64}$/);
    expect(documentIdSearchHash("")).toBeNull();
  });
});

describe("prisma-field-encryption", () => {
  it("cifra campos de nivel superior y calcula el hash del documento", () => {
    const args = encryptWriteArgs("PatientProfile", "update", {
      where: { id: "p1" },
      data: { documentId: "1020", phone: { set: "+57 300" }, city: "Chía" },
    });
    const data = args.data as Record<string, unknown>;
    expect(isEncryptedValue(data.documentId)).toBe(true);
    expect(isEncryptedValue((data.phone as { set: string }).set)).toBe(true);
    expect(data.city).toBe("Chía");
    expect(data.documentIdHash).toBe(documentIdSearchHash("1020"));
  });

  it("borrar el documento también borra el hash", () => {
    const args = encryptWriteArgs("PatientProfile", "update", { where: { id: "p1" }, data: { documentId: null } });
    expect(args.data).toEqual({ documentId: null, documentIdHash: null });
  });

  it("sigue las escrituras anidadas por relación", () => {
    const args = encryptWriteArgs("User", "create", {
      data: {
        email: "a@b.co",
        patient: { create: { phone: "300", allergies: { create: [{ substance: "Látex", severity: "HIGH" }] } } },
      },
    });
    const profile = ((args.data as Record<string, any>).patient.create) as Record<string, any>;
    expect(isEncryptedValue(profile.phone)).toBe(true);
    expect(isEncryptedValue(profile.allergies.create[0].substance)).toBe(true);
    expect(profile.allergies.create[0].severity).toBe("HIGH");
    expect((args.data as Record<string, unknown>).email).toBe("a@b.co");
  });

  it("cifra upsert, createMany y updates anidados con where/data", () => {
    const upsert = encryptWriteArgs("ClinicalEpisode", "upsert", {
      where: { id: "e1" },
      create: { diagnosis: "Caries" },
      update: { diagnosis: "Caries profunda" },
    });
    expect(isEncryptedValue((upsert.create as any).diagnosis)).toBe(true);
    expect(isEncryptedValue((upsert.update as any).diagnosis)).toBe(true);

    const many = encryptWriteArgs("PrescriptionItem", "createMany", { data: [{ name: "Amoxicilina", type: "MEDICATION" }] });
    expect(isEncryptedValue((many.data as any)[0].name)).toBe(true);

    const nested = encryptWriteArgs("Prescription", "update", {
      where: { id: "rx" },
      data: { content: { text: "1 cada 8 h" }, items: { updateMany: { where: {}, data: { dosage: "500 mg" } } } },
    });
    expect(isEncryptedValue((nested.data as any).content)).toBe(true);
    expect(isEncryptedValue((nested.data as any).items.updateMany.data.dosage)).toBe(true);
  });

  it("no toca lecturas", () => {
    const args = { where: { id: "x" } };
    expect(encryptWriteArgs("ClinicalNote", "findMany", args)).toBe(args);
  });

  it("descifra resultados con relaciones anidadas sin tocar fechas", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const result = decryptResult([
      { id: "n1", content: encryptText("Dolor molar"), createdAt, appointment: { patient: { phone: encryptText("300") } } },
    ]);
    expect(result[0].content).toBe("Dolor molar");
    expect(result[0].appointment.patient.phone).toBe("300");
    expect(result[0].createdAt).toBe(createdAt);
  });
});
