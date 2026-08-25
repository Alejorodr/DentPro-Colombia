// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getNotifications } from "@/app/api/notifications/route";
import { PATCH as readAllNotifications } from "@/app/api/notifications/read-all/route";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
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
    vi.mocked(isAuthorized).mockReset().mockReturnValue(false);
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

    const response = await readAllNotifications(new Request("http://localhost/api/notifications/read-all"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateContract(notificationsReadAllResponseSchema, payload).valid).toBe(true);
    expect(payload).toEqual({ updatedCount: 4 });
    expect(markAllNotificationsRead).toHaveBeenCalledWith({ userId: "user-1", allUsers: false });
  });

  it("marks all users' notifications as read for admin scope", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" } as any);
    vi.mocked(isAuthorized).mockReturnValue(true);
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ count: 9 } as any);

    const response = await readAllNotifications(
      new Request("http://localhost/api/notifications/read-all?scope=admin"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ updatedCount: 9 });
    expect(markAllNotificationsRead).toHaveBeenCalledWith({ userId: "admin-1", allUsers: true });
  });

  it("returns 401 for read-all without auth", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const response = await readAllNotifications(new Request("http://localhost/api/notifications/read-all"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(validateContract(apiErrorSchema, payload).valid).toBe(true);
  });
});
