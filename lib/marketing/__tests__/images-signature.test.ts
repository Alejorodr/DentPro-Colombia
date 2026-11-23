import { describe, expect, it } from "vitest";

import { matchesMarketingImageSignature } from "@/lib/marketing/images";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new TextEncoder().encode(text);

describe("matchesMarketingImageSignature (DOG-19)", () => {
  it("acepta las firmas reales de JPEG, PNG y WEBP", () => {
    expect(matchesMarketingImageSignature(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00), "image/jpeg")).toBe(true);
    expect(matchesMarketingImageSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00), "image/png")).toBe(true);
    const webp = new Uint8Array([...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WEBPVP8 ")]);
    expect(matchesMarketingImageSignature(webp, "image/webp")).toBe(true);
  });

  it("rechaza HTML o SVG disfrazados de imagen", () => {
    expect(matchesMarketingImageSignature(ascii("<!doctype html><script>"), "image/png")).toBe(false);
    expect(matchesMarketingImageSignature(ascii('<svg xmlns="http://www.w3.org/2000/svg">'), "image/jpeg")).toBe(false);
  });

  it("rechaza un tipo declarado que no coincide con el contenido", () => {
    expect(matchesMarketingImageSignature(bytes(0xff, 0xd8, 0xff, 0xe0), "image/png")).toBe(false);
    const riffNoWebp = new Uint8Array([...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WAVEfmt ")]);
    expect(matchesMarketingImageSignature(riffNoWebp, "image/webp")).toBe(false);
  });

  it("rechaza archivos más cortos que la firma", () => {
    expect(matchesMarketingImageSignature(bytes(0x89, 0x50), "image/png")).toBe(false);
    expect(matchesMarketingImageSignature(bytes(), "image/jpeg")).toBe(false);
  });
});
