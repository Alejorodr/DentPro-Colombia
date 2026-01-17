import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

const updateCampaignSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().trim().min(1).max(500).optional(),
  ctaText: z.string().trim().max(80).nullable().optional(),
  ctaUrl: z.string().trim().max(500).nullable().optional(),
  startAt: z.string().trim().min(1).optional(),
  endAt: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const { data: body, error } = await parseJson(request, updateCampaignSchema);
  if (error) {
    return error;
  }

  const startAt = body.startAt ? new Date(body.startAt) : null;
  const endAt = body.endAt ? new Date(body.endAt) : null;
  if (
    (startAt && Number.isNaN(startAt.getTime())) ||
    (endAt && Number.isNaN(endAt.getTime())) ||
    (startAt && endAt && startAt >= endAt)
  ) {
    return errorResponse("Rango de fechas inválido.", 400);
  }

  const prisma = getPrismaClient();
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(body.title ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
      ...(body.ctaText !== undefined ? { ctaText: body.ctaText } : {}),
      ...(body.ctaUrl !== undefined ? { ctaUrl: body.ctaUrl } : {}),
      ...(startAt ? { startAt } : {}),
      ...(endAt ? { endAt } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    },
  });

  return NextResponse.json(campaign);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
