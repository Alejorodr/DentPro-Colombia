// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/appointments/[id]/events/route";
import { requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/lib/authz", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: vi.fn() }));

describe("GET /api/appointments/[id]/events contract", () => {
  const findUnique = vi.fn();
  const findMany = vi.fn();

  beforeEach(() => {
    vi.mocked(requireSession).mockReset();
    vi.mocked(getPrismaClient).mockReset();
    findUnique.mockReset();
    findMany.mockReset();

    vi.mocked(getPrismaClient).mockReturnValue({
      appointment: { findUnique },
      appointmentEvent: { findMany },
    } as any);
  });

  it("returns events shape including reschedule metadata", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "r-1", role: "RECEPCIONISTA" } } as any);
    findUnique.mockResolvedValue({ patient: { userId: "p-1" }, professional: { userId: "prof-1" } });
    findMany.mockResolvedValue([
      {
        id: "evt-1",
        action: "rescheduled",
        metadata: { previousSlotId: "slot-a", newSlotId: "slot-b" },
        createdAt: new Date("2026-01-01T09:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "apt-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.events).toEqual([
      expect.objectContaining({
        id: "evt-1",
        action: "rescheduled",
        metadata: expect.objectContaining({ previousSlotId: "slot-a", newSlotId: "slot-b" }),
      }),
    ]);
  });

  it("returns 403 for role without permission", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "other", role: "PACIENTE" } } as any);
    findUnique.mockResolvedValue({ patient: { userId: "owner" }, professional: { userId: "prof-1" } });

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "apt-1" }) });
    expect(response.status).toBe(403);
  });

  it("returns 404 when appointment is missing", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "r-1", role: "RECEPCIONISTA" } } as any);
    findUnique.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "missing" }) });
    expect(response.status).toBe(404);
  });
});
