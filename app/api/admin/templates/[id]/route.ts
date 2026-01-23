import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/authz";
import { ClinicDocumentTemplateType } from "@prisma/client";
import { sanitizeConsentHtml } from "@/lib/security/sanitize-html";

const templateUpdateSchema = z.object({
  type: z.nativeEnum(ClinicDocumentTemplateType).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  contentHtml: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, templateUpdateSchema);
  if (error) {
    return error;
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const sanitizedContent = payload.contentHtml ? sanitizeConsentHtml(payload.contentHtml) : undefined;
  const template = await prisma.clinicDocumentTemplate.update({
    where: { id },
    data: {
      type: payload.type,
      title: payload.title,
      contentHtml: sanitizedContent,
      active: payload.active,
    },
  });

  return NextResponse.json({ template });
}
