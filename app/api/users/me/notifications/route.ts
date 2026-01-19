import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { Role } from "@prisma/client";

const notificationSchema = z.object({
  emailEnabled: z.boolean(),
});

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const prisma = getPrismaClient();
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId: sessionResult.user.id },
    select: { emailEnabled: true },
  });

  const emailEnabled = preference?.emailEnabled ?? sessionResult.user.role === Role.PACIENTE;

  return NextResponse.json({ emailEnabled });
}

export async function PATCH(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { data: payload, error } = await parseJson(request, notificationSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const updated = await prisma.notificationPreference.upsert({
    where: { userId: sessionResult.user.id },
    update: { emailEnabled: payload.emailEnabled },
    create: { userId: sessionResult.user.id, emailEnabled: payload.emailEnabled },
    select: { emailEnabled: true },
  });

  return NextResponse.json(updated);
}
