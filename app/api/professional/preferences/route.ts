import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { privacyMode: true },
  });

  return NextResponse.json({ privacyMode: user?.privacyMode ?? false });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const payload = (await request.json().catch(() => null)) as { privacyMode?: boolean } | null;

  if (typeof payload?.privacyMode !== "boolean") {
    return errorResponse("Preferencia inválida.");
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: { privacyMode: payload.privacyMode },
    select: { privacyMode: true },
  });

  return NextResponse.json({ privacyMode: user.privacyMode });
}
