import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireRole, requireSession } from "@/lib/authz";
import { logAuditEvent } from "@/lib/audit";
import { AppointmentStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

const paymentSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAmountCents: z.number().int().min(0).optional(),
});

const BILLABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.COMPLETED,
];

/**
 * Allowed payment-status transitions.
 *
 * - PENDING -> PAID | WAIVED | PENDING
 * - WAIVED  -> PAID | PENDING | WAIVED
 * - PAID    -> PAID (correction of method/amount, keeps paidAt)
 * - PAID    -> PENDING | WAIVED is a revert (e.g. refund): ADMINISTRADOR only.
 *
 * The enum has no partial-payment status, so PAID means "settled":
 * - RECEPCIONISTA must charge exactly the service price.
 * - ADMINISTRADOR may record a lower amount (discount); it is audited.
 * - Nobody may record more than the service price.
 */
const ALLOWED_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.WAIVED],
  [PaymentStatus.WAIVED]: [PaymentStatus.WAIVED, PaymentStatus.PAID, PaymentStatus.PENDING],
  [PaymentStatus.PAID]: [PaymentStatus.PAID, PaymentStatus.PENDING, PaymentStatus.WAIVED],
};

const ADMIN_ONLY_TRANSITIONS: Partial<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  [PaymentStatus.PAID]: [PaymentStatus.PENDING, PaymentStatus.WAIVED],
};

const responseSelect = {
  id: true,
  paymentStatus: true,
  paymentMethod: true,
  paidAmountCents: true,
  paidAt: true,
} as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["RECEPCIONISTA", "ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const actorRole = sessionResult.user.role;
  const isAdmin = actorRole === "ADMINISTRADOR";

  const { id } = await params;
  const { data: payload, error } = await parseJson(request, paymentSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      paidAmountCents: true,
      paidAt: true,
      servicePriceCents: true,
      service: { select: { priceCents: true } },
    },
  });

  if (!appointment) {
    return errorResponse("Cita no encontrada.", 404);
  }

  if (!BILLABLE_STATUSES.includes(appointment.status)) {
    return errorResponse("Solo se pueden cobrar citas en sala o completadas.", 422);
  }

  const previousStatus = appointment.paymentStatus;
  const nextStatus = payload.paymentStatus;

  if (!ALLOWED_TRANSITIONS[previousStatus].includes(nextStatus)) {
    return errorResponse("Esta transición de estado de pago no está permitida.", 422);
  }

  const isRevert = ADMIN_ONLY_TRANSITIONS[previousStatus]?.includes(nextStatus) ?? false;
  if (isRevert && !isAdmin) {
    await logAuditEvent({
      actor: { userId: sessionResult.user.id, role: actorRole },
      action: "appointment.payment.revert_denied",
      resourceType: "appointment",
      resourceId: appointment.id,
      targetLabel: appointment.id,
      status: "failure",
      metadata: {
        previousPaymentStatus: previousStatus,
        requestedPaymentStatus: nextStatus,
      },
    });
    return errorResponse("Solo un administrador puede revertir un pago.", 403);
  }

  // Snapshot price on the appointment wins over the current catalog price.
  const priceCents = appointment.servicePriceCents ?? appointment.service?.priceCents ?? null;

  let paymentMethod: PaymentMethod | null = null;
  let paidAmountCents: number | null = null;
  let paidAt: Date | null = null;
  let discountCents: number | null = null;

  if (nextStatus === PaymentStatus.PAID) {
    if (!payload.paymentMethod) {
      return errorResponse("Selecciona el método de pago para registrar el cobro.", 422);
    }
    if (payload.paidAmountCents === undefined || payload.paidAmountCents <= 0) {
      return errorResponse("Ingresa un monto cobrado mayor a cero.", 422);
    }
    if (priceCents !== null) {
      if (payload.paidAmountCents > priceCents) {
        return errorResponse("El monto cobrado no puede superar la tarifa del servicio.", 422);
      }
      if (payload.paidAmountCents < priceCents) {
        if (!isAdmin) {
          return errorResponse(
            "El monto cobrado debe coincidir con la tarifa del servicio. Solo un administrador puede registrar un descuento.",
            422,
          );
        }
        discountCents = priceCents - payload.paidAmountCents;
      }
    }
    paymentMethod = payload.paymentMethod;
    paidAmountCents = payload.paidAmountCents;
    // Keep the original paidAt on corrections of an already-PAID appointment.
    paidAt = previousStatus === PaymentStatus.PAID && appointment.paidAt ? appointment.paidAt : new Date();
  }
  // PENDING / WAIVED: method, amount and paidAt are cleared. Leaving PAID only
  // reaches this point for an administrator (checked above).

  // Conditional update: only applies if nobody changed the payment meanwhile.
  const result = await prisma.appointment.updateMany({
    where: {
      id,
      status: { in: BILLABLE_STATUSES },
      paymentStatus: previousStatus,
      paymentMethod: appointment.paymentMethod,
      paidAmountCents: appointment.paidAmountCents,
    },
    data: {
      paymentStatus: nextStatus,
      paymentMethod,
      paidAmountCents,
      paidAt,
    },
  });

  if (result.count === 0) {
    return errorResponse("El cobro fue modificado por otra persona. Recarga e intenta de nuevo.", 409);
  }

  const updated = await prisma.appointment.findUnique({
    where: { id },
    select: responseSelect,
  });

  if (!updated) {
    return errorResponse("Cita no encontrada.", 404);
  }

  await logAuditEvent({
    actor: { userId: sessionResult.user.id, role: actorRole },
    action: isRevert ? "appointment.payment.reverted" : "appointment.payment.recorded",
    resourceType: "appointment",
    resourceId: updated.id,
    targetLabel: updated.id,
    status: "success",
    metadata: {
      paymentStatus: updated.paymentStatus,
      paymentMethod: updated.paymentMethod,
      paidAmountCents: updated.paidAmountCents,
      previousPaymentStatus: previousStatus,
      previousPaymentMethod: appointment.paymentMethod,
      previousPaidAmountCents: appointment.paidAmountCents,
      previousPaidAt: appointment.paidAt ? appointment.paidAt.toISOString() : null,
      servicePriceCents: priceCents,
      discountCents,
    },
  });

  return NextResponse.json(updated);
}
