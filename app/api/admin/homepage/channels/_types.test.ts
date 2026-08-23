import { describe, expect, it } from "vitest";

import { validateValue } from "@/app/api/admin/homepage/channels/_types";

describe("validateValue", () => {
  it("acepta números de WhatsApp válidos (solo dígitos, 7-15 caracteres)", () => {
    expect(validateValue("WHATSAPP", "573237968435")).toBe(true);
    expect(validateValue("WHATSAPP", "1234567")).toBe(true);
    expect(validateValue("WHATSAPP", "123456789012345")).toBe(true);
  });

  it("rechaza números de WhatsApp inválidos", () => {
    expect(validateValue("WHATSAPP", "123456")).toBe(false); // muy corto
    expect(validateValue("WHATSAPP", "1234567890123456")).toBe(false); // muy largo
    expect(validateValue("WHATSAPP", "+573237968435")).toBe(false); // símbolo no permitido
    expect(validateValue("WHATSAPP", "573237968abc")).toBe(false); // no numérico
    expect(validateValue("WHATSAPP", "")).toBe(false);
  });

  it("acepta números de teléfono válidos (solo dígitos, 7-15 caracteres)", () => {
    expect(validateValue("PHONE", "573237968435")).toBe(true);
    expect(validateValue("PHONE", "1234567")).toBe(true);
  });

  it("rechaza números de teléfono inválidos", () => {
    expect(validateValue("PHONE", "123456")).toBe(false);
    expect(validateValue("PHONE", "57 323 796 8435")).toBe(false);
  });

  it("acepta correos electrónicos válidos", () => {
    expect(validateValue("EMAIL", "contacto@dentprocolombia.com")).toBe(true);
    expect(validateValue("EMAIL", "citas+dentpro@example.co")).toBe(true);
  });

  it("rechaza correos electrónicos inválidos", () => {
    expect(validateValue("EMAIL", "no-es-un-correo")).toBe(false);
    expect(validateValue("EMAIL", "falta-dominio@")).toBe(false);
    expect(validateValue("EMAIL", "")).toBe(false);
  });
});
