import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/appointments/[id]/payment/route";

const { requireSessionMock, requireRoleMock, parseJsonMock, prismaMock, logAuditEventMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  parseJsonMock: vi.fn(),
  prismaMock: {
    appointment: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  logAuditEventMock: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));

vi.mock("@/app/api/_utils/validation", () => ({
  parseJson: parseJsonMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => prismaMock,
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: logAuditEventMock,
}));

const PAID_AT = new Date("2026-11-20T15:00:00.000Z");

function baseAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: "apt-1",
    status: "COMPLETED",
    paymentStatus: "PENDING",
    paymentMethod: null,
    paidAmountCents: null,
    paidAt: null,
    servicePriceCents: 15000000,
    service: { priceCents: 15000000 },
    ...overrides,
  };
}

function asRole(role: "RECEPCIONISTA" | "ADMINISTRADOR") {
  requireSessionMock.mockResolvedValue({ user: { id: `u-${role}`, role } });
}

function withPayload(data: Record<string, unknown>) {
  parseJsonMock.mockResolvedValue({ data, error: null });
}

function withAppointment(appointment: Record<string, unknown>, updated?: Record<string, unknown>) {
  prismaMock.appointment.findUnique.mockReset();
  prismaMock.appointment.findUnique.mockResolvedValueOnce(appointment);
  if (updated) {
    prismaMock.appointment.findUnique.mockResolvedValueOnce(updated);
  }
}

async function callPatch() {
  const request = new Request("http://localhost/api/appointments/apt-1/payment", { method: "PATCH" });
  return PATCH(request, { params: Promise.resolve({ id: "apt-1" }) });
}

describe("PATCH /api/appointments/[id]/payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asRole("RECEPCIONISTA");
    requireRoleMock.mockReturnValue(null);
    prismaMock.appointment.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects PAID without payment method with 422", async () => {
    withAppointment(baseAppointment());
    withPayload({ paymentStatus: "PAID", paidAmountCents: 15000000 });

    const response = await callPatch();

    expect(response.status).toBe(422);
    expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("rejects PAID without a positive amount with 422", async () => {
    withAppointment(baseAppointment());
    withPayload({ paymentStatus: "PAID", paymentMethod: "CASH", paidAmountCents: 0 });

    const response = await callPatch();

    expect(response.status).toBe(422);
    expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an amount above the service price with 422", async () => {
    withAppointment(baseAppointment());
    withPayload({ paymentStatus: "PAID", paymentMethod: "CARD", paidAmountCents: 15000001 });

    const response = await callPatch();
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toMatch(/superar la tarifa/);
    expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a receptionist discount (amount below price) with 422", async () => {
    withAppointment(baseAppointment());
    withPayload({ paymentStatus: "PAID", paymentMethod: "CARD", paidAmountCents: 10000000 });

    const response = await callPatch();

    expect(response.status).toBe(422);
    expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("records a valid PAID payment with a conditional update and audit", async () => {
    const updated = {
      id: "apt-1",
      paymentStatus: "PAID",
      paymentMethod: "CASH",
      paidAmountCents: 15000000,
      paidAt: PAID_AT,
    };
    withAppointment(baseAppointment(), updated);
    withPayload({ paymentStatus: "PAID", paymentMethod: "CASH", paidAmountCents: 15000000 });

    const response = await callPatch();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ...updated, paidAt: PAID_AT.toISOString() });

    const updateArgs = prismaMock.appointment.updateMany.mock.calls[0][0];
    expect(updateArgs.where).toMatchObject({ id: "apt-1", paymentStatus: "PENDING", paymentMethod: null, paidAmountCents: null });
    expect(updateArgs.data).toMatchObject({ paymentStatus: "PAID", paymentMethod: "CASH", paidAmountCents: 15000000 });
    expect(updateArgs.data.paidAt).toBeInstanceOf(Date);

    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "appointment.payment.recorded",
        status: "success",
        metadata: expect.objectContaining({ paymentStatus: "PAID", previousPaymentStatus: "PENDING" }),
      }),
    );
  });

  it("keeps paidAt when correcting an already PAID appointment", async () => {
    const previous = baseAppointment({ paymentStatus: "PAID", paymentMethod: "CASH", paidAmountCents: 15000000, paidAt: PAID_AT });
    withAppointment(previous, { id: "apt-1", paymentStatus: "PAID", paymentMethod: "CARD", paidAmountCents: 15000000, paidAt: PAID_AT });
    withPayload({ paymentStatus: "PAID", paymentMethod: "CARD", paidAmountCents: 15000000 });

    const response = await callPatch();

    expect(response.status).toBe(200);
    expect(prismaMock.appointment.updateMany.mock.calls[0][0].data.paidAt).toBe(PAID_AT);
  });

  it("forbids a receptionist from reverting a PAID appointment", async () => {
    withAppointment(baseAppointment({ paymentStatus: "PAID", paymentMethod: "CASH", paidAmountCents: 15000000, paidAt: PAID_AT }));
    withPayload({ paymentStatus: "PENDING" });

    const response = await callPatch();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Solo un administrador puede revertir un pago.");
    expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "appointment.payment.revert_denied", status: "failure" }),
    );
  });

  it("lets an admin revert a PAID appointment and audits previous values", async () => {
    asRole("ADMINISTRADOR");
    withAppointment(
      baseAppointment({ paymentStatus: "PAID", paymentMethod: "TRANSFER", paidAmountCents: 15000000, paidAt: PAID_AT }),
      { id: "apt-1", paymentStatus: "PENDING", paymentMethod: null, paidAmountCents: null, paidAt: null },
    );
    withPayload({ paymentStatus: "PENDING" });

    const response = await callPatch();

    expect(response.status).toBe(200);
    expect(prismaMock.appointment.updateMany.mock.calls[0][0].data).toEqual({
      paymentStatus: "PENDING",
      paymentMethod: null,
      paidAmountCents: null,
      paidAt: null,
    });
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "appointment.payment.reverted",
        status: "success",
        metadata: expect.objectContaining({
          paymentStatus: "PENDING",
          previousPaymentStatus: "PAID",
          previousPaymentMethod: "TRANSFER",
          previousPaidAmountCents: 15000000,
          previousPaidAt: PAID_AT.toISOString(),
        }),
      }),
    );
  });

  it("lets an admin record a discounted amount and audits the discount", async () => {
    asRole("ADMINISTRADOR");
    withAppointment(baseAppointment(), { id: "apt-1", paymentStatus: "PAID", paymentMethod: "CARD", paidAmountCents: 12000000, paidAt: PAID_AT });
    withPayload({ paymentStatus: "PAID", paymentMethod: "CARD", paidAmountCents: 12000000 });

    const response = await callPatch();

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ discountCents: 3000000 }) }),
    );
  });

  it("rejects non-billable appointment status with 422", async () => {
    withAppointment(baseAppointment({ status: "SCHEDULED" }));
    withPayload({ paymentStatus: "PAID", paymentMethod: "CASH", paidAmountCents: 15000000 });

    const response = await callPatch();

    expect(response.status).toBe(422);
    expect(prismaMock.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("returns 409 when the payment changed concurrently", async () => {
    withAppointment(baseAppointment());
    withPayload({ paymentStatus: "PAID", paymentMethod: "CASH", paidAmountCents: 15000000 });
    prismaMock.appointment.updateMany.mockResolvedValueOnce({ count: 0 });

    const response = await callPatch();

    expect(response.status).toBe(409);
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });
});
