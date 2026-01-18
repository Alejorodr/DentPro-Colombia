import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { getClientDashboardData } from "@/lib/portal/client-dashboard";
import { requireRole, requireSession } from "@/lib/authz";

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PACIENTE"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const dashboard = await getClientDashboardData(prisma, sessionResult.user.id);

  if (!dashboard) {
    return errorResponse("Perfil de paciente no encontrado.", 404);
  }

  return NextResponse.json(dashboard);
}
