// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/services/route";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: vi.fn(),
  isAuthorized: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

describe("POST /api/services", () => {
  const service = {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" } as any);
    vi.mocked(isAuthorized).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue({ service } as any);
    service.create.mockResolvedValue({
      id: "svc-1",
      name: "Odontología general",
      description: null,
      priceCents: 100000,
      durationMinutes: 30,
      active: true,
      specialtyId: null,
      iconKey: "Tooth",
      showOnHomepage: false,
      homepageSortOrder: 0,
    });
  });

  it("rechaza HTML en name", async () => {
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "<strong>Promo</strong>",
          description: "Contenido plano",
          priceCents: 100000,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Datos inválidos.");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("rechaza HTML en description", async () => {
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Odontología general",
          description: "<img src=x onerror=alert(1)>",
          priceCents: 100000,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Datos inválidos.");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("acepta un servicio válido sin HTML", async () => {
    const response = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Odontología general",
          description: "Atención integral",
          priceCents: 100000,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(service.create).toHaveBeenCalledTimes(1);
  });
});
