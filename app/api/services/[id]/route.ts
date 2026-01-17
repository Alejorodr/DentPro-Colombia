import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  priceCents: z.number().int().min(0).optional(),
  durationMinutes: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const { data: body, error } = await parseJson(request, updateServiceSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const service = await prisma.service.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(typeof body.priceCents === "number" ? { priceCents: body.priceCents } : {}),
      ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    },
  });

  return NextResponse.json(service);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
