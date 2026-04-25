// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/campaigns/route";

const { requireAdminMock, logAuditEventMock, createMock, parseJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  logAuditEventMock: vi.fn(),
  createMock: vi.fn(),
  parseJsonMock: vi.fn(),
}));

vi.mock("@/app/api/admin/homepage/_lib", async () => {
  const actual = await vi.importActual<typeof import("@/app/api/admin/homepage/_lib")>("@/app/api/admin/homepage/_lib");
  return {
    ...actual,
    requireAdmin: requireAdminMock,
  };
});

vi.mock("@/app/api/_utils/validation", () => ({
  parseJson: parseJsonMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(() => ({
    campaign: { create: createMock },
  })),
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: logAuditEventMock,
}));

describe("POST /api/campaigns audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, sessionUser: { id: "admin-1", role: "ADMINISTRADOR" } });
    parseJsonMock.mockResolvedValue({
      data: {
        title: "Campaña Abril",
        description: "Promo",
        imageUrl: "https://cdn.example.com/campaign.png",
        ctaText: "Ver",
        ctaUrl: "https://dentpro.co/promo",
        startAt: "2026-04-01T00:00:00.000Z",
        endAt: "2026-04-30T23:59:59.000Z",
        active: true,
      },
    });
    createMock.mockResolvedValue({
      id: "cmp-1",
      title: "Campaña Abril",
      description: "Promo",
      imageUrl: "https://cdn.example.com/campaign.png",
      ctaText: "Ver",
      ctaUrl: "https://dentpro.co/promo",
      startAt: new Date("2026-04-01T00:00:00.000Z"),
      endAt: new Date("2026-04-30T23:59:59.000Z"),
      active: true,
    });
  });

  it("registra auditoría de creación exitosa", async () => {
    const response = await POST(new Request("http://localhost/api/campaigns", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "campaign.created",
        resourceType: "campaign",
        resourceId: "cmp-1",
        status: "success",
      }),
    );
  });
});
