import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["RECEPCIONISTA", "ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 403);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? "6"), 10);
  const prisma = getPrismaClient();

  const [patients, professionals, services, appointments] = await Promise.all([
    prisma.patientProfile.findMany({
      where: {
        active: true,
        user: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      include: { user: true },
      take: limit,
      orderBy: { user: { name: "asc" } },
    }),
    prisma.professionalProfile.findMany({
      where: {
        active: true,
        user: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      include: { user: true, specialty: true },
      take: limit,
      orderBy: { user: { name: "asc" } },
    }),
    prisma.service.findMany({
      where: { name: { contains: query, mode: "insensitive" }, active: true },
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        OR: [
          { reason: { contains: query, mode: "insensitive" } },
          { id: { contains: query, mode: "insensitive" } },
          {
            patient: {
              user: {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { lastName: { contains: query, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      },
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true } },
        timeSlot: true,
      },
      orderBy: { timeSlot: { startAt: "desc" } },
      take: limit,
    }),
  ]);

  const results = [
    ...patients.map((patient) => ({
      type: "Paciente",
      id: patient.id,
      label: `${patient.user.name} ${patient.user.lastName}`,
      description: patient.user.email,
      href: `/portal/receptionist/patients?patient=${patient.id}`,
    })),
    ...professionals.map((professional) => ({
      type: "Profesional",
      id: professional.id,
      label: `${professional.user.name} ${professional.user.lastName}`,
      description: professional.specialty?.name ?? "Sin especialidad",
      href: "/portal/receptionist/staff",
    })),
    ...services.map((service) => ({
      type: "Servicio",
      id: service.id,
      label: service.name,
      description: `COP ${(service.priceCents / 100).toLocaleString("es-CO")}`,
      href: "/portal/receptionist/billing",
    })),
    ...appointments.map((appointment) => ({
      type: "Turno",
      id: appointment.id,
      label: `${appointment.patient?.user.name ?? "Paciente"} ${appointment.patient?.user.lastName ?? ""}`.trim(),
      description: `${appointment.status === AppointmentStatus.CANCELLED ? "Cancelado" : appointment.status} · ${appointment.timeSlot.startAt.toLocaleDateString("es-CO")}`,
      href: "/portal/receptionist/schedule",
    })),
  ];

  return NextResponse.json({ results });
}
