import { NextResponse } from "next/server";
import { z } from "zod";

import { unstable_cache } from "next/cache";

import { CATALOG_CACHE_VERSION, CATALOG_REVALIDATE_SECONDS, CATALOG_TAGS } from "@/lib/cache/catalog";
import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { Prisma } from "@prisma/client";

const specialtySchema = z.object({
  name: z.string().trim().min(1).max(120),
  defaultSlotDurationMinutes: z.number().int().min(1).max(240),
  active: z.boolean().optional(),
});

// DOG-14: catálogo pequeño y casi fijo; se invalida al escribir en Specialty.
const listSpecialties = unstable_cache(
  () => getPrismaClient().specialty.findMany({ orderBy: { name: "asc" } }),
  ["specialties-list", CATALOG_CACHE_VERSION],
  { tags: [CATALOG_TAGS.specialties], revalidate: CATALOG_REVALIDATE_SECONDS },
);

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const specialties = await listSpecialties();
  return NextResponse.json(specialties);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para crear especialidades.", 403);
  }

  const { data: payload, error } = await parseJson(request, specialtySchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();

  try {
    const specialty = await prisma.specialty.create({
      data: {
        name: payload.name.trim(),
        defaultSlotDurationMinutes: payload.defaultSlotDurationMinutes,
        active: payload.active ?? true,
      },
    });

    return NextResponse.json(specialty, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
      if (target.includes("name")) {
        return errorResponse("Ya existe una especialidad con ese nombre.", 400);
      }
    }
    return errorResponse("No se pudo crear la especialidad.");
  }
}
