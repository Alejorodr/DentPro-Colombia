import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

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

  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    imageUrl?: string;
    ctaText?: string | null;
    ctaUrl?: string | null;
    startAt?: string;
    endAt?: string;
    active?: boolean;
  };

  if (!body.title || !body.imageUrl || !body.startAt || !body.endAt) {
    return errorResponse("Título, imagen y rango de fechas son obligatorios.", 400);
  }

  const prisma = getPrismaClient();
  const campaign = await prisma.campaign.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      imageUrl: body.imageUrl,
      ctaText: body.ctaText ?? null,
      ctaUrl: body.ctaUrl ?? null,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      active: body.active ?? true,
    },
  });

  return NextResponse.json(campaign);
}
