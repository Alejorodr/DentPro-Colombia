// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/activity/feed/route";
import { requireSession } from "@/lib/authz";
import { getActivityFeed } from "@/lib/activity/feed";

vi.mock("@/lib/authz", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/activity/feed", () => ({ getActivityFeed: vi.fn() }));

describe("GET /api/activity/feed contract", () => {
  beforeEach(() => {
    vi.mocked(requireSession).mockReset();
    vi.mocked(getActivityFeed).mockReset();
  });

  it("returns expected shape with events and nextCursor", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "user-1", role: "RECEPCIONISTA" } } as any);
    vi.mocked(getActivityFeed).mockResolvedValue({
      events: [
        {
          id: "event_evt-1",
          type: "appointment_status_changed",
          appointmentId: "apt-1",
          actor: "Diana Mora",
          timestamp: "2026-01-01T10:00:00.000Z",
          message: "Estado cambiado a confirmada.",
        },
      ],
      nextCursor: "2026-01-01T10:00:00.000Z|event|evt-1",
    });

    const response = await GET(new Request("http://localhost/api/activity/feed?limit=10"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      events: [
        expect.objectContaining({
          id: "event_evt-1",
          type: "appointment_status_changed",
          appointmentId: "apt-1",
          actor: "Diana Mora",
          timestamp: expect.any(String),
          message: expect.any(String),
        }),
      ],
      nextCursor: expect.any(String),
    });
  });

  it("rejects invalid query filters", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "user-1", role: "RECEPCIONISTA" } } as any);

    const response = await GET(new Request("http://localhost/api/activity/feed?limit=0"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Parámetros inválidos para activity feed." });
  });

  it("returns 401 without auth", async () => {
    vi.mocked(requireSession).mockResolvedValue({ error: { message: "No autorizado.", status: 401 } } as any);

    const response = await GET(new Request("http://localhost/api/activity/feed"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("No autorizado.");
  });

  it("forwards cursor and type filters to feed service", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "user-1", role: "PACIENTE" } } as any);
    vi.mocked(getActivityFeed).mockResolvedValue({ events: [], nextCursor: null });

    await GET(new Request("http://localhost/api/activity/feed?limit=5&type=appointment_rescheduled&cursor=2026-01-01T10:00:00.000Z%7Cevent%7Cevt-1"));

    expect(getActivityFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        role: "PACIENTE",
        limit: 5,
        cursor: "2026-01-01T10:00:00.000Z|event|evt-1",
        filters: expect.objectContaining({ type: "appointment_rescheduled" }),
      }),
    );
  });
});
