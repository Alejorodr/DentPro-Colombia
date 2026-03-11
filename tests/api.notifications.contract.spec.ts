// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getNotifications } from "@/app/api/notifications/route";
import { PATCH as readAllNotifications } from "@/app/api/notifications/read-all/route";
import { getSessionUser } from "@/app/api/_utils/auth";
import {
  apiErrorSchema,
  notificationsReadAllResponseSchema,
  notificationsResponseSchema,
} from "@/lib/api/contracts/schemas";
import { validateContract } from "@/lib/api/contracts/validate";
import { getPrismaClient } from "@/lib/prisma";
import { markAllNotificationsRead } from "@/lib/notifications";

vi.mock("@/app/api/_utils/auth", () => ({ getSessionUser: vi.fn(), isAuthorized: vi.fn(() => false) }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ markAllNotificationsRead: vi.fn() }));

describe("notifications contract", () => {
  const findMany = vi.fn();
  const count = vi.fn();

  beforeEach(() => {
    vi.mocked(getSessionUser).mockReset();
    vi.mocked(getPrismaClient).mockReset();
    vi.mocked(markAllNotificationsRead).mockReset();
    findMany.mockReset();
    count.mockReset();

    vi.mocked(getPrismaClient).mockReturnValue({
      notification: { findMany, count },
    } as any);
  });

  it("returns shape with notifications, unreadCount and nextCursor", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: "user-1", role: "RECEPCIONISTA" } as any);
    findMany.mockResolvedValue([
      { id: "n-1", title: "A", createdAt: new Date("2026-01-01T10:00:00.000Z"), readAt: null },
      { id: "n-2", title: "B", createdAt: new Date("2026-01-01T09:00:00.000Z"), readAt: null },
    ]);
    count.mockResolvedValue(2);

    const response = await getNotifications(new Request("http://localhost/api/notifications?limit=1"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateContract(notificationsResponseSchema, payload).valid).toBe(true);
    expect(payload.notifications[0]).toEqual(expect.objectContaining({ id: "n-1", title: "A" }));
  });

  it("returns 401 without auth", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await getNotifications(new Request("http://localhost/api/notifications"));
    expect(response.status).toBe(401);
  });

  it("rejects invalid query", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: "user-1", role: "RECEPCIONISTA" } as any);

    const response = await getNotifications(new Request("http://localhost/api/notifications?limit=0"));
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(validateContract(apiErrorSchema, payload).valid).toBe(true);
    expect(payload.error).toContain("Parámetros inválidos");
  });

  it("marks all as read and returns updatedCount", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: "user-1", role: "RECEPCIONISTA" } as any);
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ count: 4 } as any);

    const response = await readAllNotifications();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateContract(notificationsReadAllResponseSchema, payload).valid).toBe(true);
    expect(payload).toEqual({ updatedCount: 4 });
    expect(markAllNotificationsRead).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("returns 401 for read-all without auth", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await readAllNotifications();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(validateContract(apiErrorSchema, payload).valid).toBe(true);
  });
});
