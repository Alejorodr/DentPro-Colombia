import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["RECEPCIONISTA", "ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 403);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const activeOnly = searchParams.get("active") === "true";

  const prisma = getPrismaClient();
  const patients = await prisma.patientProfile.findMany({
    where: {
      ...(activeOnly ? { active: true } : {}),
      ...(query
        ? {
            user: {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(patients);
}
