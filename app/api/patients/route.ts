import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const prisma = getPrismaClient();
  const where: Prisma.PatientProfileWhereInput = {
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
  };
  const [patients, total] = await Promise.all([
    prisma.patientProfile.findMany({
      where,
      include: { user: true },
      orderBy: { user: { name: "asc" } },
      skip,
      take,
    }),
    prisma.patientProfile.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResponse(patients, page, pageSize, total));
}
