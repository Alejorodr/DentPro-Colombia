import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * Cifrado de campos sensibles a nivel de aplicación (DOG-18), AES-256-GCM.
 *
 * Formato guardado en la base: `enc:v1:<keyId>:<iv>:<tag>:<ciphertext>` (base64url).
 * Los valores JSON usan el prefijo `encj:v1:` para volver a parsearse al leer.
 * Un valor sin prefijo se devuelve tal cual: así conviven filas viejas en claro con
 * filas nuevas cifradas hasta que corre el script de migración.
 *
 * Claves (Vercel, nunca en Git):
 * - FIELD_ENCRYPTION_KEY: clave actual, 32 bytes en base64.
 * - FIELD_ENCRYPTION_KEY_ID: identificador corto de la clave actual (p. ej. "k1").
 * - FIELD_ENCRYPTION_PREVIOUS_KEYS: claves anteriores para descifrar tras una rotación,
 *   como "k0:base64,kx:base64".
 * - FIELD_HASH_KEY: clave HMAC para los índices de búsqueda (documento de identidad).
 *   No rota: cambiarla obliga a recalcular todos los hashes.
 */

const TEXT_PREFIX = "enc:v1:";
const JSON_PREFIX = "encj:v1:";
const IV_BYTES = 12;

type Keyring = { currentId: string; keys: Map<string, Buffer> };

let cachedKeyring: Keyring | null | undefined;

function decodeKey(raw: string, name: string): Buffer {
  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== 32) {
    throw new Error(`${name} debe ser una clave de 32 bytes en base64.`);
  }
  return key;
}

function loadKeyring(): Keyring | null {
  if (cachedKeyring !== undefined) return cachedKeyring;
  const current = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!current) {
    if (process.env.VERCEL_ENV === "production") {
      console.warn("[field-encryption] FIELD_ENCRYPTION_KEY no está configurada: los datos sensibles se guardan en claro.");
    }
    cachedKeyring = null;
    return null;
  }
  const currentId = process.env.FIELD_ENCRYPTION_KEY_ID?.trim() || "k1";
  if (!/^[A-Za-z0-9_-]{1,16}$/.test(currentId)) {
    throw new Error("FIELD_ENCRYPTION_KEY_ID solo admite letras, números, - y _ (máx. 16).");
  }
  const keys = new Map<string, Buffer>([[currentId, decodeKey(current, "FIELD_ENCRYPTION_KEY")]]);
  for (const entry of (process.env.FIELD_ENCRYPTION_PREVIOUS_KEYS ?? "").split(",")) {
    const [id, raw] = entry.split(":");
    if (id?.trim() && raw?.trim() && !keys.has(id.trim())) {
      keys.set(id.trim(), decodeKey(raw, `FIELD_ENCRYPTION_PREVIOUS_KEYS (${id.trim()})`));
    }
  }
  cachedKeyring = { currentId, keys };
  return cachedKeyring;
}

/** Solo para tests: fuerza a releer las variables de entorno. */
export function __resetFieldEncryptionForTests() {
  cachedKeyring = undefined;
}

export function isFieldEncryptionEnabled(): boolean {
  return loadKeyring() !== null;
}

export function isEncryptedValue(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith(TEXT_PREFIX) || value.startsWith(JSON_PREFIX));
}

function seal(plaintext: string, prefix: string, keyring: Keyring): string {
  const key = keyring.keys.get(keyring.currentId)!;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [prefix + keyring.currentId, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

function open(sealed: string, prefix: string): string {
  const keyring = loadKeyring();
  const [keyId, iv, tag, ciphertext] = sealed.slice(prefix.length).split(":");
  const key = keyring?.keys.get(keyId ?? "");
  if (!key || !iv || !tag || ciphertext === undefined) {
    throw new Error(`No hay clave para descifrar un campo (clave "${keyId}"). Revisa FIELD_ENCRYPTION_*.`);
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** Cifra un texto. Sin clave configurada lo deja igual (modo transición). */
export function encryptText(value: string): string {
  const keyring = loadKeyring();
  if (!keyring || isEncryptedValue(value)) return value;
  return seal(value, TEXT_PREFIX, keyring);
}

/** Cifra un valor JSON serializándolo. Sin clave lo deja igual. */
export function encryptJson(value: unknown): unknown {
  const keyring = loadKeyring();
  if (!keyring || value === null || value === undefined || isEncryptedValue(value)) return value;
  return seal(JSON.stringify(value), JSON_PREFIX, keyring);
}

/** Descifra si el valor viene cifrado; si no, lo devuelve igual. */
export function decryptValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.startsWith(TEXT_PREFIX)) return open(value, TEXT_PREFIX);
  if (value.startsWith(JSON_PREFIX)) return JSON.parse(open(value, JSON_PREFIX));
  return value;
}

/** Normaliza un documento de identidad: sin espacios, puntos ni guiones, en mayúsculas. */
export function normalizeDocumentId(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

/**
 * Hash de búsqueda (HMAC-SHA256) para encontrar un documento exacto sin descifrar.
 * Devuelve null si no hay FIELD_HASH_KEY o el valor queda vacío.
 */
export function documentIdSearchHash(value: string | null | undefined): string | null {
  const hashKey = process.env.FIELD_HASH_KEY?.trim();
  if (!hashKey || !value) return null;
  const normalized = normalizeDocumentId(value);
  if (!normalized) return null;
  return createHmac("sha256", decodeKey(hashKey, "FIELD_HASH_KEY")).update(normalized).digest("hex");
}
