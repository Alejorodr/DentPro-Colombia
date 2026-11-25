import { describe, expect, it } from "vitest";

import { isSafeAttachmentDataUrl } from "@/lib/security/attachment-url";
import { decodeBase64Header, matchesFileSignature } from "@/lib/security/file-signature";

// DOG-33: validación del contenido real (magic bytes), no solo del tipo declarado.

const b64 = (bytes: number[] | string) =>
  Buffer.from(typeof bytes === "string" ? bytes : Uint8Array.from(bytes)).toString("base64");

const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20];

describe("matchesFileSignature", () => {
  it("reconoce WEBP por RIFF y WEBP en el offset 8", () => {
    expect(matchesFileSignature(Uint8Array.from(WEBP), "image/webp")).toBe(true);
    // RIFF sin WEBP (p. ej. un WAV) no es una imagen WEBP.
    const wav = [...WEBP.slice(0, 8), 0x57, 0x41, 0x56, 0x45];
    expect(matchesFileSignature(Uint8Array.from(wav), "image/webp")).toBe(false);
  });

  it("ignora mayúsculas en el tipo declarado y rechaza tipos desconocidos", () => {
    expect(matchesFileSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), "IMAGE/JPEG")).toBe(true);
    expect(matchesFileSignature(Uint8Array.from([0x3c, 0x73, 0x76, 0x67]), "image/svg+xml")).toBe(false);
  });

  it("decodifica solo la cabecera del base64", () => {
    // Redondea a bloques base64 completos: al menos los bytes pedidos, sin decodificar todo.
    const header = decodeBase64Header(b64("%PDF-1.7 resto del archivo"), 5);
    expect(Array.from(header.slice(0, 5))).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(header.length).toBeLessThan(10);
    expect(decodeBase64Header("").length).toBe(0);
  });
});

describe("isSafeAttachmentDataUrl con magic bytes", () => {
  it("acepta dataUrls cuyo contenido coincide con el tipo", () => {
    expect(isSafeAttachmentDataUrl(`data:image/jpeg;base64,${b64([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])}`)).toBe(true);
    expect(isSafeAttachmentDataUrl(`data:image/webp;base64,${b64(WEBP)}`)).toBe(true);
  });

  it("rechaza un HTML disfrazado de PNG o PDF", () => {
    const html = b64("<html><script>alert(1)</script></html>");
    expect(isSafeAttachmentDataUrl(`data:image/png;base64,${html}`)).toBe(false);
    expect(isSafeAttachmentDataUrl(`data:application/pdf;base64,${html}`, "application/pdf")).toBe(false);
  });
});
