import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../../_lib";

const locationUpdateSchema = z
  .object({
    name: requiredText(1, 180).optional(),
    description: requiredText(1, 280).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type LocationRecord = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeLocation(location: LocationRecord) {
  return {
    id: location.id,
    name: location.name,
    description: location.description,
    sortOrder: location.sortOrder,
    isActive: location.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ locationId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { locationId } = await context.params;
  const { data: body, error } = await parseJson(request, locationUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageLocation.findUnique({ where: { id: locationId } });
  if (!existing) {
    return errorResponse("Sede no encontrada.", 404);
  }

  const updated = await prisma.homepageLocation.update({
    where: { id: locationId },
    data: body,
  });

  return NextResponse.json({ location: serializeLocation(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ locationId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { locationId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageLocation.findUnique({ where: { id: locationId } });
  if (!existing) {
    return errorResponse("Sede no encontrada.", 404);
  }

  await prisma.homepageLocation.delete({ where: { id: locationId } });

  const remaining = await prisma.homepageLocation.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageLocation.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
