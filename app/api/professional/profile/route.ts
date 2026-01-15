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
    include: { user: true, specialty: true },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  return NextResponse.json({
    profile: {
      name: professional.user.name,
      lastName: professional.user.lastName,
      email: professional.user.email,
      specialty: professional.specialty?.name ?? null,
    },
  });
}
