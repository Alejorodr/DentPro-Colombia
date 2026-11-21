import { addDaysZoned, formatDateInput, fromZonedDateParts, getAnalyticsTimeZone, startOfZonedDay } from "@/lib/dates/tz";
import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { requireRole, requireSession } from "@/lib/authz";
import { AppointmentStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

// El día de cobro es el día calendario de la clínica (America/Bogota), no el del servidor:
// en Vercel el servidor corre en UTC y el día quedaba corrido 5 horas.
function resolveClinicDay(param: string | null): { dayStart: Date; dayEnd: Date } {
  const timeZone = getAnalyticsTimeZone();
  const match = param ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(param) : null;
  const dayStart = match
    ? fromZonedDateParts(
        { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: 0, minute: 0, second: 0 },
        timeZone,
      )
    : startOfZonedDay(new Date(), timeZone);
  const dayEnd = new Date(addDaysZoned(dayStart, 1, timeZone).getTime() - 1);
  return { dayStart, dayEnd };
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
  const { dayStart, dayEnd } = resolveClinicDay(dateStr);

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
    date: formatDateInput(dayStart, getAnalyticsTimeZone()),
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
