import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { upsertSlotAppointment } from "@/lib/appointments/upsert-slot-appointment";

const data = {
  patientId: "pat-1",
  professionalId: "pro-1",
  serviceId: "svc-1",
  serviceName: "Limpieza",
  servicePriceCents: 100,
  reason: "Limpieza",
  status: "CONFIRMED" as const,
};

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" });
}

function makeClient() {
  return {
    appointment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("upsertSlotAppointment", () => {
  it("creates the appointment when the slot has none", async () => {
    const client = makeClient();
    client.appointment.findFirst.mockResolvedValue(null);
    client.appointment.create.mockResolvedValue({ id: "new" });

    await upsertSlotAppointment(client as never, "slot-1", data);

    expect(client.appointment.create).toHaveBeenCalledWith({ data: { ...data, timeSlotId: "slot-1" } });
    expect(client.appointment.update).not.toHaveBeenCalled();
  });

  it("updates the active appointment, not a newer cancelled one", async () => {
    const client = makeClient();
    client.appointment.findFirst.mockResolvedValueOnce({ id: "active" });
    client.appointment.update.mockResolvedValue({ id: "active" });

    await upsertSlotAppointment(client as never, "slot-1", data);

    expect(client.appointment.findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: { timeSlotId: "slot-1", status: { not: "CANCELLED" } },
    });
    expect(client.appointment.update).toHaveBeenCalledWith({ where: { id: "active" }, data });
  });

  it("recovers when a concurrent seed wins the create race (P2002)", async () => {
    const client = makeClient();
    client.appointment.findFirst
      .mockResolvedValueOnce(null) // sin activa
      .mockResolvedValueOnce(null) // sin ninguna
      .mockResolvedValueOnce({ id: "winner" }); // la que creó el otro seed
    client.appointment.create.mockRejectedValue(p2002());
    client.appointment.update.mockResolvedValue({ id: "winner" });

    await upsertSlotAppointment(client as never, "slot-1", data);

    expect(client.appointment.update).toHaveBeenCalledWith({ where: { id: "winner" }, data });
  });

  it("rethrows errors that are not an active-slot conflict", async () => {
    const client = makeClient();
    client.appointment.findFirst.mockResolvedValue(null);
    client.appointment.create.mockRejectedValue(new Error("db down"));

    await expect(upsertSlotAppointment(client as never, "slot-1", data)).rejects.toThrow("db down");
  });
});
