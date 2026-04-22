import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { noHtml, requireAdmin, requiredText } from "../../_lib";

const bookingValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(noHtml, "No se permite HTML.")
  .refine((value) => /^[\p{L}\p{N}_\- ]+$/u.test(value), "El valor solo puede contener letras, números, espacios, guion y guion bajo.")
  .transform((value) => value.replace(/\s+/g, " "));

const bookingOptionUpdateSchema = z
  .object({
    value: bookingValueSchema.optional(),
    label: requiredText(1, 120).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type BookingOptionRecord = {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeBookingOption(option: BookingOptionRecord) {
  return {
    id: option.id,
    value: option.value,
    label: option.label,
    sortOrder: option.sortOrder,
    isActive: option.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ optionId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { optionId } = await context.params;
  const { data: body, error } = await parseJson(request, bookingOptionUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageBookingOption.findUnique({ where: { id: optionId } });
  if (!existing) {
    return errorResponse("Opción de agenda no encontrada.", 404);
  }

  if (body.value) {
    const duplicate = await prisma.homepageBookingOption.findUnique({ where: { value: body.value } });
    if (duplicate && duplicate.id !== optionId) {
      return errorResponse("Ya existe una opción de agenda con ese valor.", 400);
    }
  }

  const updated = await prisma.homepageBookingOption.update({
    where: { id: optionId },
    data: body,
  });

  return NextResponse.json({ bookingOption: serializeBookingOption(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ optionId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { optionId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageBookingOption.findUnique({ where: { id: optionId } });
  if (!existing) {
    return errorResponse("Opción de agenda no encontrada.", 404);
  }

  await prisma.homepageBookingOption.delete({ where: { id: optionId } });

  const remaining = await prisma.homepageBookingOption.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageBookingOption.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
