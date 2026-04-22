import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

import { noHtml, requireAdmin, requiredText } from "../_lib";

const bookingValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(noHtml, "No se permite HTML.")
  .refine((value) => /^[\p{L}\p{N}_\- ]+$/u.test(value), "El valor solo puede contener letras, números, espacios, guion y guion bajo.")
  .transform((value) => value.replace(/\s+/g, " "));

const bookingOptionCreateSchema = z.object({
  value: bookingValueSchema,
  label: requiredText(1, 120),
  isActive: z.boolean().optional(),
});

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const options = await prisma.homepageBookingOption.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ bookingOptions: options.map(serializeBookingOption) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, bookingOptionCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageBookingOption.aggregate({ _max: { sortOrder: true } });

  const duplicate = await prisma.homepageBookingOption.findUnique({ where: { value: body.value } });
  if (duplicate) {
    return errorResponse("Ya existe una opción de agenda con ese valor.", 400);
  }

  const bookingOption = await prisma.homepageBookingOption.create({
    data: {
      value: body.value,
      label: body.label,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ bookingOption: serializeBookingOption(bookingOption) }, { status: 201 });
}
