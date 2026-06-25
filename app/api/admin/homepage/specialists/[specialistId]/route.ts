import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { optionalImageUrl, optionalText, requireAdmin, requiredText } from "../../_lib";

const specialistUpdateSchema = z
  .object({
    fullName: requiredText(1, 120).optional(),
    specialty: requiredText(1, 120).optional(),
    bioShort: requiredText(1, 600).optional(),
    imageUrl: optionalImageUrl().optional(),
    altText: optionalText(180).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

function serializeSpecialist(specialist: {
  id: string;
  fullName: string;
  specialty: string;
  bioShort: string;
  imageUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: specialist.id,
    fullName: specialist.fullName,
    specialty: specialist.specialty,
    bioShort: specialist.bioShort,
    imageUrl: specialist.imageUrl,
    altText: specialist.altText,
    sortOrder: specialist.sortOrder,
    isActive: specialist.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ specialistId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { specialistId } = await context.params;
  const { data: body, error } = await parseJson(request, specialistUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageSpecialist.findUnique({ where: { id: specialistId } });
  if (!existing) {
    return errorResponse("Especialista no encontrado.", 404);
  }

  const updated = await prisma.homepageSpecialist.update({
    where: { id: specialistId },
    data: body,
  });

  return NextResponse.json({ specialist: serializeSpecialist(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ specialistId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { specialistId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageSpecialist.findUnique({ where: { id: specialistId } });
  if (!existing) {
    return errorResponse("Especialista no encontrado.", 404);
  }

  await prisma.homepageSpecialist.delete({ where: { id: specialistId } });
  const remaining = await prisma.homepageSpecialist.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageSpecialist.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
