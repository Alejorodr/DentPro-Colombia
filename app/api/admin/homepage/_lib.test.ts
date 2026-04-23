import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: vi.fn(),
  isAuthorized: vi.fn(),
}));

import { noHtml, requiredAbsoluteHttpUrl, requiredHref } from "@/app/api/admin/homepage/_lib";

describe("homepage admin validation helpers", () => {
  it("bloquea texto con etiquetas HTML", () => {
    expect(noHtml("Contenido plano")).toBe(true);
    expect(noHtml("<strong>Contenido</strong>")).toBe(false);
  });

  it("acepta solo URL http(s) absolutas para imágenes", () => {
    expect(requiredAbsoluteHttpUrl(500).safeParse("https://cdn.example.com/hero.webp").success).toBe(true);
    expect(requiredAbsoluteHttpUrl(500).safeParse("mailto:test@example.com").success).toBe(false);
    expect(requiredAbsoluteHttpUrl(500).safeParse("/assets/hero.webp").success).toBe(false);
  });

  it("permite href internos y protocolos soportados", () => {
    expect(requiredHref(500).safeParse("#agenda").success).toBe(true);
    expect(requiredHref(500).safeParse("/tratamientos").success).toBe(true);
    expect(requiredHref(500).safeParse("https://example.com").success).toBe(true);
    expect(requiredHref(500).safeParse("javascript:alert(1)").success).toBe(false);
  });
});
