// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/appointments/[id]/events/route";
import { apiErrorSchema, appointmentEventsResponseSchema } from "@/lib/api/contracts/schemas";
import { validateContract } from "@/lib/api/contracts/validate";
import { requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/lib/authz", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: vi.fn() }));

describe("GET /api/appointments/[id]/events contract", () => {
  const findFirst = vi.fn();
  const findMany = vi.fn();

  beforeEach(() => {
    vi.mocked(requireSession).mockReset();
    vi.mocked(getPrismaClient).mockReset();
    findFirst.mockReset();
    findMany.mockReset();

    vi.mocked(getPrismaClient).mockReturnValue({
      appointment: { findFirst },
      appointmentEvent: { findMany },
    } as any);
  });

  it("returns events shape including reschedule metadata", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "r-1", role: "RECEPCIONISTA" } } as any);
    findFirst.mockResolvedValue({ id: "appt-1" });
    findMany.mockResolvedValue([
      {
        id: "evt-1",
        action: "rescheduled",
        metadata: { previousSlotId: "slot-a", newSlotId: "slot-b" },
        createdAt: new Date("2026-01-01T09:00:00.000Z"),
      },
    ]);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateContract(appointmentEventsResponseSchema, payload).valid).toBe(true);
    expect(payload.events).toEqual([
      expect.objectContaining({
        id: "evt-1",
        action: "rescheduled",
        metadata: expect.objectContaining({ previousSlotId: "slot-a", newSlotId: "slot-b" }),
      }),
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          actorUser: { select: { id: true, name: true, lastName: true } },
        }),
      }),
    );
  });

  it("returns 404 for out-of-scope role access", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "other", role: "PACIENTE" } } as any);
    findFirst.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(validateContract(apiErrorSchema, payload).valid).toBe(true);
  });

  it("returns 404 when appointment is 00000000-0000-4000-8000-000000000000", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "r-1", role: "RECEPCIONISTA" } } as any);
    findFirst.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) });
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(validateContract(apiErrorSchema, payload).valid).toBe(true);
  });

  it("removes event metadata and actor ids for patient-scoped reads", async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: "p-1", role: "PACIENTE" } } as any);
    findFirst.mockResolvedValue({ id: "appt-1" });
    findMany.mockResolvedValue([
      {
        id: "evt-1",
        appointmentId: "appt-1",
        actorRole: "ADMINISTRADOR",
        action: "rescheduled",
        previousStatus: "SCHEDULED",
        newStatus: "CONFIRMED",
        metadata: { previousSlotId: "slot-a", newSlotId: "slot-b" },
        createdAt: new Date("2026-01-01T09:00:00.000Z"),
        actorUser: { id: "admin-1", name: "Ada", lastName: "Lovelace" },
      },
    ]);

    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.events[0]).toMatchObject({
      id: "evt-1",
      appointmentId: "appt-1",
      actorRole: "ADMINISTRADOR",
      action: "rescheduled",
      actorUser: { name: "Ada", lastName: "Lovelace" },
    });
    expect(payload.events[0]).not.toHaveProperty("metadata");
    expect(payload.events[0].actorUser).not.toHaveProperty("id");
  });
});
