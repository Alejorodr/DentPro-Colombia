import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) para el segundo factor (DOG-28): HMAC-SHA1, 6 dígitos, pasos de 30 s. Son los
 * parámetros por defecto de Google Authenticator, Microsoft Authenticator, 1Password, etc.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
/** Pasos aceptados antes y después del actual, para tolerar relojes desfasados (±30 s). */
const DRIFT_STEPS = 1;

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Secreto base32 inválido.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Secreto de 160 bits (lo que recomienda RFC 4226 para HMAC-SHA1), en base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpStep(timeMs: number): number {
  return Math.floor(timeMs / 1000 / TOTP_PERIOD_SECONDS);
}

export function generateTotp(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

/**
 * Verifica un código y devuelve el paso que coincidió, o `null`. Rechaza pasos iguales o anteriores
 * a `lastUsedStep` para que un código interceptado no se pueda reutilizar.
 */
export function verifyTotp(
  secret: string,
  code: string,
  options: { now?: number; lastUsedStep?: number | null } = {},
): number | null {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  const current = totpStep(options.now ?? Date.now());
  const expected = Buffer.from(normalized);
  for (let delta = -DRIFT_STEPS; delta <= DRIFT_STEPS; delta += 1) {
    const step = current + delta;
    if (options.lastUsedStep != null && step <= options.lastUsedStep) continue;
    if (timingSafeEqual(Buffer.from(generateTotp(secret, step)), expected)) return step;
  }
  return null;
}

/** URI `otpauth://` que leen las apps autenticadoras (y que va dentro del código QR). */
export function buildOtpauthUri(params: { secret: string; accountName: string; issuer: string }): string {
  const label = encodeURIComponent(`${params.issuer}:${params.accountName}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}
