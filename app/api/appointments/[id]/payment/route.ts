import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireRole, requireSession } from "@/lib/authz";
import { AppointmentStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

const paymentSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAmountCents: z.number().int().min(0).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["RECEPCIONISTA", "ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { id } = await params;
  const { data: payload, error } = await parseJson(request, paymentSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!appointment) {
    return errorResponse("Cita no encontrada.", 404);
  }

  const billableStatuses: AppointmentStatus[] = [
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.COMPLETED,
  ];
  if (!billableStatuses.includes(appointment.status)) {
    return errorResponse("Solo se pueden cobrar citas en sala o completadas.", 422);
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      paymentStatus: payload.paymentStatus,
      paymentMethod: payload.paymentMethod ?? null,
      paidAmountCents: payload.paidAmountCents ?? null,
      paidAt: payload.paymentStatus === PaymentStatus.PAID ? new Date() : null,
    },
    select: {
      id: true,
      paymentStatus: true,
      paymentMethod: true,
      paidAmountCents: true,
      paidAt: true,
    },
  });

  return NextResponse.json(updated);
}
