import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";
import { logAuditEvent } from "@/lib/audit";

const preferencesSchema = z.object({
  privacyMode: z.boolean(),
});

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: sessionResult.user.id },
    select: { privacyMode: true },
  });

  return NextResponse.json({ privacyMode: user?.privacyMode ?? false });
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, preferencesSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.update({
    where: { id: sessionResult.user.id },
    data: { privacyMode: payload.privacyMode },
    select: { privacyMode: true },
  });

  await logAuditEvent({
    actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
    action: "professional.preferences.updated",
    resourceType: "user",
    resourceId: sessionResult.user.id,
    targetLabel: sessionResult.user.id,
    status: "success",
    metadata: {
      privacyMode: user.privacyMode,
    },
  });

  return NextResponse.json({ privacyMode: user.privacyMode });
}
