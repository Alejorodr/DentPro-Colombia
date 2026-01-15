import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const payload = (await request.json().catch(() => null)) as { content?: string } | null;
  const content = payload?.content?.trim();

  if (!content) {
    return errorResponse("La nota no puede estar vacía.");
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionUser.id },
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
    where: { appointmentId: appointment.id, authorUserId: sessionUser.id },
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
          authorUserId: sessionUser.id,
          content,
        },
      });

  return NextResponse.json({ note });
}
