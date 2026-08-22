// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/services/[id]/route";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: vi.fn(),
  isAuthorized: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

describe("PATCH /api/services/[id]", () => {
  const service = {
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" } as any);
    vi.mocked(isAuthorized).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue({ service } as any);
    service.update.mockResolvedValue({
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
    const response = await PATCH(
      new Request("http://localhost/api/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "<strong>Promo</strong>" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Datos inválidos.");
    expect(service.update).not.toHaveBeenCalled();
  });

  it("rechaza HTML en description", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "<img src=x onerror=alert(1)>" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Datos inválidos.");
    expect(service.update).not.toHaveBeenCalled();
  });

  it("acepta una actualización válida sin HTML", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Odontología general" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    );

    expect(response.status).toBe(200);
    expect(service.update).toHaveBeenCalledTimes(1);
  });
});
