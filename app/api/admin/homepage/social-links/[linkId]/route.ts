import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredAbsoluteHttpUrl, requiredText } from "../../_lib";

const socialLinkUpdateSchema = z
  .object({
    href: requiredAbsoluteHttpUrl(500).optional(),
    label: requiredText(1, 120).optional(),
    iconKey: z.enum(MARKETING_ICON_KEYS).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type SocialLinkRecord = {
  id: string;
  href: string;
  label: string;
  iconKey: (typeof MARKETING_ICON_KEYS)[number];
  sortOrder: number;
  isActive: boolean;
};

function serializeSocialLink(link: SocialLinkRecord) {
  return {
    id: link.id,
    href: link.href,
    label: link.label,
    iconKey: link.iconKey,
    sortOrder: link.sortOrder,
    isActive: link.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ linkId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { linkId } = await context.params;
  const { data: body, error } = await parseJson(request, socialLinkUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageSocialLink.findUnique({ where: { id: linkId } });
  if (!existing) {
    return errorResponse("Enlace social no encontrado.", 404);
  }

  const updated = await prisma.homepageSocialLink.update({
    where: { id: linkId },
    data: body,
  });

  return NextResponse.json({ socialLink: serializeSocialLink(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ linkId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { linkId } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageSocialLink.findUnique({ where: { id: linkId } });
  if (!existing) {
    return errorResponse("Enlace social no encontrado.", 404);
  }

  await prisma.homepageSocialLink.delete({ where: { id: linkId } });

  const remaining = await prisma.homepageSocialLink.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageSocialLink.update({
        where: { id: item.id },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
