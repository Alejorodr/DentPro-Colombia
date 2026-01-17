import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

const campaignSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().trim().min(1).max(500),
  ctaText: z.string().trim().max(80).nullable().optional(),
  ctaUrl: z.string().trim().max(500).nullable().optional(),
  startAt: z.string().trim().min(1),
  endAt: z.string().trim().min(1),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";
  const now = new Date();

  const prisma = getPrismaClient();
  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(activeOnly
        ? {
            active: true,
            startAt: { lte: now },
            endAt: { gte: now },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const { data: body, error } = await parseJson(request, campaignSchema);
  if (error) {
    return error;
  }

  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
    return errorResponse("Rango de fechas inválido.", 400);
  }

  const prisma = getPrismaClient();
  const campaign = await prisma.campaign.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      imageUrl: body.imageUrl,
      ctaText: body.ctaText ?? null,
      ctaUrl: body.ctaUrl ?? null,
      startAt,
      endAt,
      active: body.active ?? true,
    },
  });

  return NextResponse.json(campaign);
}
