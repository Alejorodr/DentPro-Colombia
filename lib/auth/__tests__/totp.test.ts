import { describe, expect, it } from "vitest";

import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateTotp,
  generateTotpSecret,
  totpStep,
  verifyTotp,
} from "@/lib/auth/totp";

// Vectores de prueba de RFC 6238 (apéndice B) para SHA-1 con el secreto ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));
const RFC_VECTORS: Array<[number, string]> = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
];

describe("TOTP (DOG-28)", () => {
  it("cumple los vectores de RFC 6238 (últimos 6 dígitos)", () => {
    for (const [seconds, expected] of RFC_VECTORS) {
      expect(generateTotp(RFC_SECRET, totpStep(seconds * 1000))).toBe(expected.slice(-6));
    }
  });

  it("base32 ida y vuelta", () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(() => base32Decode("1!")).toThrow();
  });

  it("genera secretos de 160 bits distintos", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateTotpSecret()).not.toBe(secret);
  });

  it("acepta el paso actual y uno de desfase, no dos", () => {
    const secret = generateTotpSecret();
    const now = 1_800_000_000_000;
    const step = totpStep(now);
    expect(verifyTotp(secret, generateTotp(secret, step), { now })).toBe(step);
    expect(verifyTotp(secret, generateTotp(secret, step - 1), { now })).toBe(step - 1);
    expect(verifyTotp(secret, generateTotp(secret, step + 1), { now })).toBe(step + 1);
    expect(verifyTotp(secret, generateTotp(secret, step - 2), { now })).toBeNull();
  });

  it("no deja reutilizar un código ya usado", () => {
    const secret = generateTotpSecret();
    const now = 1_800_000_000_000;
    const step = totpStep(now);
    const code = generateTotp(secret, step);
    expect(verifyTotp(secret, code, { now, lastUsedStep: step })).toBeNull();
    expect(verifyTotp(secret, code, { now, lastUsedStep: step - 1 })).toBe(step);
  });

  it("rechaza formatos que no son 6 dígitos y tolera espacios", () => {
    const secret = generateTotpSecret();
    const now = 1_800_000_000_000;
    const code = generateTotp(secret, totpStep(now));
    expect(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, { now })).not.toBeNull();
    expect(verifyTotp(secret, "12345", { now })).toBeNull();
    expect(verifyTotp(secret, "abcdef", { now })).toBeNull();
  });

  it("arma la URI otpauth con emisor y cuenta", () => {
    const uri = buildOtpauthUri({ secret: "ABC", accountName: "ana@dentpro.co", issuer: "DentPro Colombia" });
    expect(uri.startsWith("otpauth://totp/DentPro%20Colombia%3Aana%40dentpro.co?")).toBe(true);
    expect(new URL(uri).searchParams.get("secret")).toBe("ABC");
    expect(new URL(uri).searchParams.get("issuer")).toBe("DentPro Colombia");
  });
});
