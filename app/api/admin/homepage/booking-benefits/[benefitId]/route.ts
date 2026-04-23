import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { normalizeMarketingIconKey, requireAdmin, requiredText } from "../../_lib";

const bookingBenefitUpdateSchema = z
  .object({
    iconKey: z.enum(MARKETING_ICON_KEYS).optional(),
    text: requiredText(1, 280).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type BookingBenefitRecord = {
  id: string;
  iconKey: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeBookingBenefit(benefit: BookingBenefitRecord) {
  return {
    id: benefit.id,
    iconKey: normalizeMarketingIconKey(benefit.iconKey, "CalendarCheck"),
    text: benefit.text,
    sortOrder: benefit.sortOrder,
    isActive: benefit.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ benefitId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { benefitId } = await context.params;
  const { data: body, error } = await parseJson(request, bookingBenefitUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageBookingBenefit.findUnique({ where: { id: benefitId } });
  if (!existing) {
    return errorResponse("Beneficio de agenda no encontrado.", 404);
  }

  const updated = await prisma.homepageBookingBenefit.update({
    where: { id: benefitId },
    data: body,
  });

  return NextResponse.json({ bookingBenefit: serializeBookingBenefit(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ benefitId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { benefitId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageBookingBenefit.findUnique({ where: { id: benefitId } });
  if (!existing) {
    return errorResponse("Beneficio de agenda no encontrado.", 404);
  }

  await prisma.homepageBookingBenefit.delete({ where: { id: benefitId } });

  const remaining = await prisma.homepageBookingBenefit.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageBookingBenefit.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
