// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";
import { getPrismaClient } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("logAuditEvent", () => {
  const createMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue({ auditLog: { create: createMock } } as any);
    createMock.mockResolvedValue({ id: "audit-1" });
  });

  it("persiste eventos con metadata resumida", async () => {
    await logAuditEvent({
      actor: { userId: "user-1", role: "ADMINISTRADOR" },
      action: "campaign.updated",
      resourceType: "campaign",
      resourceId: "cmp-1",
      status: "success",
      metadata: {
        changedFields: ["title", "active"],
        changedFieldCount: 2,
      },
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "campaign.updated",
          resourceType: "campaign",
          status: "success",
          metadata: {
            changedFields: ["title", "active"],
            changedFieldCount: 2,
          },
        }),
      }),
    );
  });

  it("no rompe el flujo si falla la escritura", async () => {
    createMock.mockRejectedValueOnce(new Error("db down"));

    await expect(
      logAuditEvent({
        action: "homepage.settings.updated",
        resourceType: "homepage_settings",
        status: "failure",
      }),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalled();
  });
});
