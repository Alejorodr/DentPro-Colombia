import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { requireRole, requireSession } from "@/lib/authz";
import { AppointmentStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

function parseDateParam(param: string | null): Date | null {
  if (!param) return null;
  const d = new Date(`${param}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["RECEPCIONISTA", "ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const baseDate = parseDateParam(dateStr) ?? new Date();

  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(baseDate);
  dayEnd.setHours(23, 59, 59, 999);

  const prisma = getPrismaClient();

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.COMPLETED] },
      timeSlot: { startAt: { gte: dayStart, lte: dayEnd } },
    },
    select: {
      id: true,
      serviceName: true,
      servicePriceCents: true,
      paymentStatus: true,
      paymentMethod: true,
      paidAmountCents: true,
      paidAt: true,
      status: true,
      timeSlot: { select: { startAt: true } },
      patient: {
        select: {
          user: { select: { name: true, lastName: true } },
          patientCode: true,
        },
      },
      professional: {
        select: { user: { select: { name: true, lastName: true } } },
      },
    },
    orderBy: { timeSlot: { startAt: "asc" } },
  });

  const totalBilled = appointments
    .filter((a) => a.paymentStatus === PaymentStatus.PAID)
    .reduce((sum, a) => sum + (a.paidAmountCents ?? a.servicePriceCents ?? 0), 0);

  const totalPending = appointments
    .filter((a) => a.paymentStatus === PaymentStatus.PENDING)
    .reduce((sum, a) => sum + (a.servicePriceCents ?? 0), 0);

  const byMethod: Record<PaymentMethod, number> = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
  };
  for (const a of appointments) {
    if (a.paymentStatus === PaymentStatus.PAID && a.paymentMethod) {
      byMethod[a.paymentMethod] += a.paidAmountCents ?? a.servicePriceCents ?? 0;
    }
  }

  return NextResponse.json({
    date: baseDate.toISOString().slice(0, 10),
    summary: {
      totalBilledCents: totalBilled,
      totalPendingCents: totalPending,
      count: appointments.length,
      paidCount: appointments.filter((a) => a.paymentStatus === PaymentStatus.PAID).length,
      pendingCount: appointments.filter((a) => a.paymentStatus === PaymentStatus.PENDING).length,
      byMethod,
    },
    appointments: appointments.map((a) => ({
      id: a.id,
      patientName: `${a.patient.user.name} ${a.patient.user.lastName}`.trim(),
      patientCode: a.patient.patientCode,
      professionalName: `${a.professional.user.name} ${a.professional.user.lastName}`.trim(),
      serviceName: a.serviceName ?? "—",
      servicePriceCents: a.servicePriceCents ?? null,
      startAt: a.timeSlot.startAt.toISOString(),
      status: a.status,
      paymentStatus: a.paymentStatus,
      paymentMethod: a.paymentMethod,
      paidAmountCents: a.paidAmountCents,
      paidAt: a.paidAt?.toISOString() ?? null,
    })),
  });
}
