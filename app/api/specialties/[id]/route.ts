import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";

const updateSpecialtySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  defaultSlotDurationMinutes: z.number().int().min(1).max(240).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para actualizar especialidades.", 403);
  }

  const { data: payload, error } = await parseJson(request, updateSpecialtySchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const updated = await prisma.specialty.update({
    where: { id },
    data: {
      name: payload.name?.trim() || undefined,
      defaultSlotDurationMinutes: payload.defaultSlotDurationMinutes ?? undefined,
      active: typeof payload.active === "boolean" ? payload.active : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para eliminar especialidades.", 403);
  }

  const prisma = getPrismaClient();
  await prisma.specialty.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
