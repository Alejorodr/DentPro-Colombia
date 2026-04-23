import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { optionalAbsoluteHttpUrl, optionalText, requireAdmin, requiredAbsoluteHttpUrl, requiredText } from "@/app/api/admin/homepage/_lib";

const updateCampaignSchema = z.object({
  title: requiredText(1, 120).optional(),
  description: optionalText(500).optional(),
  imageUrl: requiredAbsoluteHttpUrl(500).optional(),
  ctaText: optionalText(80).optional(),
  ctaUrl: optionalAbsoluteHttpUrl(500).optional(),
  startAt: z.string().trim().min(1).optional(),
  endAt: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data: body, error } = await parseJson(request, updateCampaignSchema);
  if (error) {
    return error;
  }

  const startAt = body.startAt ? new Date(body.startAt) : undefined;
  const endAt = body.endAt ? new Date(body.endAt) : undefined;
  if (
    (startAt && Number.isNaN(startAt.getTime())) ||
    (endAt && Number.isNaN(endAt.getTime()))
  ) {
    return errorResponse("Rango de fechas inválido.", 400);
  }

  const prisma = getPrismaClient();
  const existing = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, startAt: true, endAt: true },
  });
  if (!existing) {
    return errorResponse("Campaña no encontrada.", 404);
  }

  const effectiveStartAt = startAt ?? existing.startAt;
  const effectiveEndAt = endAt ?? existing.endAt;
  if (effectiveStartAt >= effectiveEndAt) {
    return errorResponse("Rango de fechas inválido.", 400);
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.ctaText !== undefined ? { ctaText: body.ctaText } : {}),
      ...(body.ctaUrl !== undefined ? { ctaUrl: body.ctaUrl } : {}),
      ...(startAt !== undefined ? { startAt } : {}),
      ...(endAt !== undefined ? { endAt } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    },
  });

  return NextResponse.json(campaign);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const prisma = getPrismaClient();
  try {
    await prisma.campaign.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return errorResponse("Campaña no encontrada.", 404);
    }
    throw error;
  }
  return NextResponse.json({ status: "ok" });
}
