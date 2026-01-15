import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionUser.id },
  });

  if (!professional) {
    return NextResponse.json({ notifications: [] });
  }

  const since = new Date();
  since.setDate(since.getDate() - 3);

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId: professional.id,
      updatedAt: { gte: since },
    },
    include: { patient: { include: { user: true } } },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const notifications = appointments.map((appointment) => ({
    id: appointment.id,
    title: `Appointment ${appointment.status.toLowerCase()}`,
    body: `Patient ${appointment.patient.user.name} ${appointment.patient.user.lastName}`,
    createdAt: appointment.updatedAt.toISOString(),
  }));

  return NextResponse.json({ notifications });
}
