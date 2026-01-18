import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
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
