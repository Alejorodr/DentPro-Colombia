import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
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

  const prisma = getPrismaClient();
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...(body.title ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
      ...(body.ctaText !== undefined ? { ctaText: body.ctaText } : {}),
      ...(body.ctaUrl !== undefined ? { ctaUrl: body.ctaUrl } : {}),
      ...(body.startAt ? { startAt: new Date(body.startAt) } : {}),
      ...(body.endAt ? { endAt: new Date(body.endAt) } : {}),
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
