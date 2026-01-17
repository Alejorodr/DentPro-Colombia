import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  priceCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

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

  const { data: body, error } = await parseJson(request, serviceSchema);
  if (error) {
    return error;
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
