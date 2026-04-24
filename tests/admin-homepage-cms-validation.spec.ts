// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postService } from "@/app/api/admin/homepage/services/route";
import { POST as postLegalLink } from "@/app/api/admin/homepage/legal-links/route";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: vi.fn(),
  isAuthorized: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

describe("homepage CMS validations", () => {
  const homepageService = {
    aggregate: vi.fn(),
    create: vi.fn(),
  };
  const homepageLegalLink = {
    aggregate: vi.fn(),
    create: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" } as any);
    vi.mocked(isAuthorized).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue({ homepageService, homepageLegalLink } as any);
    homepageService.aggregate.mockResolvedValue({ _max: { sortOrder: 3 } });
    homepageService.create.mockResolvedValue({
      id: "svc-1",
      title: "Título",
      description: "Descripción",
      iconKey: "Tooth",
      sortOrder: 4,
      isActive: true,
      highlights: [],
    });
    homepageLegalLink.aggregate.mockResolvedValue({ _max: { sortOrder: 1 } });
    homepageLegalLink.create.mockResolvedValue({
      id: "legal-1",
      href: "/terminos",
      label: "Términos",
      sortOrder: 2,
      isActive: true,
    });
  });

  it("rechaza HTML en title de servicios", async () => {
    const response = await postService(
      new Request("http://localhost/api/admin/homepage/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "<strong>Promo</strong>",
          description: "Contenido plano",
          iconKey: "Tooth",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Datos inválidos.");
    expect(homepageService.create).not.toHaveBeenCalled();
  });

  it("rechaza iconKey inválido en servicios", async () => {
    const response = await postService(
      new Request("http://localhost/api/admin/homepage/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Odontología general",
          description: "Atención integral",
          iconKey: "InvalidIcon",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(homepageService.create).not.toHaveBeenCalled();
  });

  it("rechaza href inválido en links legales", async () => {
    const response = await postLegalLink(
      new Request("http://localhost/api/admin/homepage/legal-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          href: "javascript:alert(1)",
          label: "Aviso legal",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(homepageLegalLink.create).not.toHaveBeenCalled();
  });
});
