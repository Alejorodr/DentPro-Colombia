import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../_lib";

const bookingBenefitCreateSchema = z.object({
  iconKey: z.enum(MARKETING_ICON_KEYS),
  text: requiredText(1, 280),
  isActive: z.boolean().optional(),
});

type BookingBenefitRecord = {
  id: string;
  iconKey: (typeof MARKETING_ICON_KEYS)[number];
  text: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeBookingBenefit(benefit: BookingBenefitRecord) {
  return {
    id: benefit.id,
    iconKey: benefit.iconKey,
    text: benefit.text,
    sortOrder: benefit.sortOrder,
    isActive: benefit.isActive,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const benefits = await prisma.homepageBookingBenefit.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ bookingBenefits: benefits.map(serializeBookingBenefit) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, bookingBenefitCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageBookingBenefit.aggregate({ _max: { sortOrder: true } });

  const bookingBenefit = await prisma.homepageBookingBenefit.create({
    data: {
      iconKey: body.iconKey,
      text: body.text,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ bookingBenefit: serializeBookingBenefit(bookingBenefit) }, { status: 201 });
}
