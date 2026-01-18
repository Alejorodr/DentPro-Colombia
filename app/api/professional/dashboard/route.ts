import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { requireRole, requireSession } from "@/lib/authz";

function getDayRange(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const { start, end } = getDayRange(dateParam);

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
  });

  if (!professional) {
    return NextResponse.json({ appointments: [], counts: {} });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId: professional.id,
      timeSlot: {
        startAt: {
          gte: start,
          lte: end,
        },
      },
    },
    include: {
      patient: { include: { user: true } },
      timeSlot: true,
    },
    orderBy: { timeSlot: { startAt: "asc" } },
  });

  const counts = appointments.reduce(
    (acc, appointment) => {
      acc[appointment.status] = (acc[appointment.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<AppointmentStatus, number>,
  );

  return NextResponse.json({
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      startAt: appointment.timeSlot.startAt.toISOString(),
      endAt: appointment.timeSlot.endAt.toISOString(),
      status: appointment.status,
      reason: appointment.reason,
      serviceName: appointment.serviceName,
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.user.name,
        lastName: appointment.patient.user.lastName,
        patientCode: appointment.patient.patientCode,
      },
    })),
    counts,
  });
}
