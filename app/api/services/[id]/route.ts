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
    name?: string;
    description?: string | null;
    priceCents?: number;
    durationMinutes?: number | null;
    active?: boolean;
  };

  const prisma = getPrismaClient();
  const service = await prisma.service.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(typeof body.priceCents === "number" ? { priceCents: body.priceCents } : {}),
      ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    },
  });

  return NextResponse.json(service);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ status: "ok" });
}
