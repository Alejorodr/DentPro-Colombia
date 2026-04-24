import { describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: vi.fn(),
  isAuthorized: vi.fn(),
}));

import { noHtml, requiredAbsoluteHttpUrl, requiredHref } from "@/app/api/admin/homepage/_lib";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { requireAdmin } from "@/app/api/admin/homepage/_lib";

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

  it("requireAdmin devuelve 401 cuando no hay sesión", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);

    const result = await requireAdmin();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("requireAdmin devuelve 403 cuando la sesión no es ADMINISTRADOR", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce({ id: "user-1", role: "PACIENTE" });
    vi.mocked(isAuthorized).mockReturnValueOnce(false);

    const result = await requireAdmin();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("requireAdmin permite acceso a ADMINISTRADOR", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce({ id: "admin-1", role: "ADMINISTRADOR" });
    vi.mocked(isAuthorized).mockReturnValueOnce(true);

    const result = await requireAdmin();

    expect(result).toEqual({ ok: true, sessionUser: { id: "admin-1", role: "ADMINISTRADOR" } });
  });
});
