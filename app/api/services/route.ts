import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";
  const query = searchParams.get("q")?.trim();
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const prisma = getPrismaClient();
  const where: Prisma.ServiceWhereInput = {
    ...(activeOnly ? { active: true } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.service.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResponse(services, page, pageSize, total));
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string | null;
    priceCents?: number;
    durationMinutes?: number | null;
    active?: boolean;
  };

  if (!body.name || typeof body.priceCents !== "number") {
    return errorResponse("Nombre y precio son obligatorios.", 400);
  }

  const prisma = getPrismaClient();
  const service = await prisma.service.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      priceCents: body.priceCents,
      durationMinutes: body.durationMinutes ?? null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json(service);
}
