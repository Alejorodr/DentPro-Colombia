import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { getClientDashboardData } from "@/lib/portal/client-dashboard";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PACIENTE") {
    return errorResponse("No autorizado.", 403);
  }

  const prisma = getPrismaClient();
  const dashboard = await getClientDashboardData(prisma, sessionUser.id);

  if (!dashboard) {
    return errorResponse("Perfil de paciente no encontrado.", 404);
  }

  return NextResponse.json(dashboard);
}
