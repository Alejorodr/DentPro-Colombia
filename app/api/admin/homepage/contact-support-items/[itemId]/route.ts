import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { normalizeMarketingIconKey, requireAdmin, requiredText } from "../../_lib";

const contactSupportItemUpdateSchema = z
  .object({
    iconKey: z.enum(MARKETING_ICON_KEYS).optional(),
    text: requiredText(1, 280).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type ContactSupportItemRecord = {
  id: string;
  iconKey: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
};

function serializeContactSupportItem(item: ContactSupportItemRecord) {
  return {
    id: item.id,
    iconKey: normalizeMarketingIconKey(item.iconKey, "Headset"),
    text: item.text,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { itemId } = await context.params;
  const { data: body, error } = await parseJson(request, contactSupportItemUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageContactSupportItem.findUnique({ where: { id: itemId } });
  if (!existing) {
    return errorResponse("Ítem de soporte no encontrado.", 404);
  }

  const updated = await prisma.homepageContactSupportItem.update({
    where: { id: itemId },
    data: body,
  });

  return NextResponse.json({ contactSupportItem: serializeContactSupportItem(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { itemId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageContactSupportItem.findUnique({ where: { id: itemId } });
  if (!existing) {
    return errorResponse("Ítem de soporte no encontrado.", 404);
  }

  await prisma.homepageContactSupportItem.delete({ where: { id: itemId } });

  const remaining = await prisma.homepageContactSupportItem.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageContactSupportItem.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
