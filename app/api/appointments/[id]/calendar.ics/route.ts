import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { requireRole, requireSession } from "@/lib/authz";

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, [
    "PACIENTE",
    "PROFESIONAL",
    "RECEPCIONISTA",
    "ADMINISTRADOR",
  ]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      ...(sessionResult.user.role === "PACIENTE"
        ? { patient: { userId: sessionResult.user.id } }
        : sessionResult.user.role === "PROFESIONAL"
          ? { professional: { userId: sessionResult.user.id } }
          : {}),
    },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true } },
      timeSlot: true,
      service: true,
    },
  });

  if (!appointment) {
    return errorResponse("Cita no encontrada.", 404);
  }

  const summary = `Turno odontológico - ${appointment.service?.name ?? appointment.reason}`;
  const description = `Paciente: ${appointment.patient?.user.name ?? ""} ${appointment.patient?.user.lastName ?? ""}\n` +
    `Profesional: ${appointment.professional?.user.name ?? ""} ${appointment.professional?.user.lastName ?? ""}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DentPro Colombia//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@dentpro`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(appointment.timeSlot.startAt)}`,
    `DTEND:${formatIcsDate(appointment.timeSlot.endAt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename=appointment-${appointment.id}.ics`,
    },
  });
}
