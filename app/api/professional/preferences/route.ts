import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";

const preferencesSchema = z.object({
  privacyMode: z.boolean(),
});

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

  const { data: payload, error } = await parseJson(request, preferencesSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: { privacyMode: payload.privacyMode },
    select: { privacyMode: true },
  });

  return NextResponse.json({ privacyMode: user.privacyMode });
}
