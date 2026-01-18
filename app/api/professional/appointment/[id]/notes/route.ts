import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";

const noteSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, noteSchema);
  if (error) {
    return error;
  }
  const content = payload.content.trim();

  const { id } = await params;
  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!appointment || appointment.professionalId !== professional.id) {
    return errorResponse("Cita no encontrada.", 404);
  }

  const existingNote = await prisma.clinicalNote.findFirst({
    where: { appointmentId: appointment.id, authorUserId: sessionResult.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const note = existingNote
    ? await prisma.clinicalNote.update({
        where: { id: existingNote.id },
        data: { content },
      })
    : await prisma.clinicalNote.create({
        data: {
          appointmentId: appointment.id,
          authorUserId: sessionResult.user.id,
          content,
        },
      });

  return NextResponse.json({ note });
}
