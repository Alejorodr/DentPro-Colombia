import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { enforceRateLimit } from "@/app/api/_utils/ratelimit";
import { getRequestId } from "@/app/api/_utils/request";
import { getPaginationParams } from "@/app/api/_utils/pagination";
import { logger } from "@/lib/logger";
import { requireRole, requireSession } from "@/lib/authz";
import * as Sentry from "@sentry/nextjs";

const searchQuerySchema = z.string().trim().min(1).max(80);

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  const sessionResult = await requireSession();

  if ("error" in sessionResult) {
    logger.warn({
      event: "search.unauthorized",
      route: "/api/search",
      requestId,
      status: sessionResult.error.status,
    });
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, [
    "ADMINISTRADOR",
    "RECEPCIONISTA",
    "PROFESIONAL",
    "PACIENTE",
  ]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { searchParams } = new URL(request.url);
  const queryRaw = searchParams.get("q")?.trim() ?? "";
  if (!queryRaw) {
    return NextResponse.json({ results: [], items: [], page: 1, pageSize: 0, total: 0 });
  }

  const parsedQuery = searchQuerySchema.safeParse(queryRaw);
  if (!parsedQuery.success) {
    return errorResponse("Consulta inválida.", 400);
  }

  const rateLimited = await enforceRateLimit(request, "search", {
    limit: 30,
    window: "1 m",
    windowMs: 60 * 1000,
  });
  if (rateLimited) {
    logger.warn({
      event: "search.rate_limited",
      route: "/api/search",
      requestId,
      userId: sessionResult.user.id,
      status: 429,
    });
    return rateLimited;
  }

  logger.info({
    event: "search.start",
    route: "/api/search",
    requestId,
    userId: sessionResult.user.id,
  });

  const query = parsedQuery.data;
  const scope = searchParams.get("scope");
  const limitParam = Number(searchParams.get("limit") ?? "");
  const { page, pageSize: basePageSize } = getPaginationParams(searchParams);
  const pageSize = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : basePageSize;
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  const queryTake = Math.min(pageSize * page, 50);
  const prisma = getPrismaClient();

  if (scope === "professional") {
    if (sessionResult.user.role !== "PROFESIONAL") {
      return errorResponse("No autorizado.", 403);
    }

    try {
      const professional = await prisma.professionalProfile.findUnique({
        where: { userId: sessionResult.user.id },
      });

      if (!professional) {
        return NextResponse.json({ results: [], items: [], page, pageSize, total: 0 });
      }

      const [patients, appointments, notes] = await Promise.all([
        prisma.patientProfile.findMany({
          where: {
            appointments: { some: { professionalId: professional.id } },
            OR: [
              { patientCode: { contains: query, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { lastName: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            ],
          },
          include: { user: true },
          take: queryTake,
          orderBy: { user: { name: "asc" } },
        }),
        prisma.appointment.findMany({
          where: {
            professionalId: professional.id,
            OR: [
              { reason: { contains: query, mode: "insensitive" } },
              { serviceName: { contains: query, mode: "insensitive" } },
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
            timeSlot: true,
          },
          orderBy: { timeSlot: { startAt: "desc" } },
          take: queryTake,
        }),
        prisma.clinicalNote.findMany({
          where: {
            appointment: { professionalId: professional.id },
            content: { contains: query, mode: "insensitive" },
          },
          include: { appointment: { include: { patient: { include: { user: true } } } } },
          orderBy: { updatedAt: "desc" },
          take: queryTake,
        }),
      ]);

      const results = [
        ...patients.map((patient) => ({
          type: "Paciente",
          id: patient.id,
          label: `${patient.user.name} ${patient.user.lastName}`.trim(),
          description: patient.user.email,
          href: `/portal/professional/patients?patient=${patient.id}`,
        })),
        ...appointments.map((appointment) => ({
          type: "Cita",
          id: appointment.id,
          label: `${appointment.patient?.user.name ?? "Paciente"} ${appointment.patient?.user.lastName ?? ""}`.trim(),
          description: `${appointment.timeSlot.startAt.toLocaleDateString("es-CO")} · ${appointment.status}`,
          href: `/portal/professional?appointment=${appointment.id}`,
        })),
        ...notes.map((note) => ({
          type: "Nota clínica",
          id: note.id,
          label: note.content.slice(0, 40),
          description: `${note.appointment.patient?.user.name ?? "Paciente"} ${note.appointment.patient?.user.lastName ?? ""}`.trim(),
          href: `/portal/professional?appointment=${note.appointmentId}`,
        })),
      ];

      const sliced = results.slice(skip, skip + take);
      logger.info({
        event: "search.success",
        route: "/api/search",
        requestId,
        userId: sessionResult.user.id,
        status: 200,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ results: sliced, items: sliced, page, pageSize, total: results.length });
    } catch (error) {
      Sentry.captureException(error);
      logger.error({
        event: "search.failed",
        route: "/api/search",
        requestId,
        userId: sessionResult.user.id,
        status: 500,
        durationMs: Date.now() - startedAt,
        error,
      });
      return errorResponse("No se pudo completar la búsqueda.", 500);
    }
  }

  const isAdminScope = scope === "admin" && sessionResult.user.role === "ADMINISTRADOR";
  if (!["RECEPCIONISTA", "ADMINISTRADOR"].includes(sessionResult.user.role)) {
    return errorResponse("No autorizado.", 403);
  }

  const dateMatch = query.match(/^\d{4}-\d{2}-\d{2}$/);
  const parsedDate = dateMatch ? new Date(`${query}T00:00:00.000Z`) : null;
  const nextDate = parsedDate ? new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000) : null;
  const statusMatch = Object.values(AppointmentStatus).find(
    (status) => status.toLowerCase() === query.toLowerCase(),
  );

  try {
    const [patients, professionals, services, appointments, users, specialties] = await Promise.all([
      prisma.patientProfile.findMany({
        where: {
          active: true,
          OR: [
            {
              user: {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { lastName: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                ],
              },
            },
            { documentId: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { user: true },
        take: queryTake,
        orderBy: { user: { name: "asc" } },
      }),
      prisma.professionalProfile.findMany({
        where: {
          active: true,
          OR: [
            {
              user: {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { lastName: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                ],
              },
            },
            { specialty: { name: { contains: query, mode: "insensitive" } } },
          ],
        },
        include: { user: true, specialty: true },
        take: queryTake,
        orderBy: { user: { name: "asc" } },
      }),
      prisma.service.findMany({
        where: { name: { contains: query, mode: "insensitive" }, active: true },
        take: queryTake,
        orderBy: { name: "asc" },
      }),
      prisma.appointment.findMany({
        where: {
          OR: [
            { reason: { contains: query, mode: "insensitive" } },
            { id: { contains: query, mode: "insensitive" } },
            ...(statusMatch ? [{ status: statusMatch }] : []),
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
            {
              professional: {
                user: {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { lastName: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            },
            { service: { name: { contains: query, mode: "insensitive" } } },
          ],
          ...(parsedDate && nextDate
            ? {
                timeSlot: {
                  startAt: {
                    gte: parsedDate,
                    lt: nextDate,
                  },
                },
              }
            : {}),
        },
        include: {
          patient: { include: { user: true } },
          professional: { include: { user: true } },
          timeSlot: true,
        },
        orderBy: { timeSlot: { startAt: "desc" } },
        take: queryTake,
      }),
      isAdminScope
        ? prisma.user.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            },
            take: queryTake,
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      isAdminScope
        ? prisma.specialty.findMany({
            where: { name: { contains: query, mode: "insensitive" } },
            take: queryTake,
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const results = [
      ...patients.map((patient) => ({
        type: isAdminScope ? "Patients" : "Paciente",
        id: patient.id,
        label: `${patient.user.name} ${patient.user.lastName}`,
        description: patient.user.email,
        href: isAdminScope
          ? `/portal/admin/patients?patient=${patient.id}`
          : `/portal/receptionist/patients?patient=${patient.id}`,
      })),
      ...professionals.map((professional) => ({
        type: isAdminScope ? "Staff" : "Profesional",
        id: professional.id,
        label: `${professional.user.name} ${professional.user.lastName}`,
        description: professional.specialty?.name ?? "Sin especialidad",
        href: isAdminScope ? "/portal/admin/staff" : "/portal/receptionist/staff",
      })),
      ...services.map((service) => ({
        type: isAdminScope ? "Services" : "Servicio",
        id: service.id,
        label: service.name,
        description: `COP ${(service.priceCents / 100).toLocaleString("es-CO")}`,
        href: isAdminScope ? "/portal/admin/services" : "/portal/receptionist/billing",
      })),
      ...appointments.map((appointment) => ({
        type: isAdminScope ? "Appointments" : "Turno",
        id: appointment.id,
        label: `${appointment.patient?.user.name ?? "Paciente"} ${appointment.patient?.user.lastName ?? ""}`.trim(),
        description: `${appointment.status === AppointmentStatus.CANCELLED ? "Cancelado" : appointment.status} · ${appointment.timeSlot.startAt.toLocaleDateString("es-CO")}`,
        href: isAdminScope ? "/portal/admin/appointments" : "/portal/receptionist/schedule",
      })),
      ...(isAdminScope
        ? users.map((user) => ({
            type: "Users",
            id: user.id,
            label: `${user.name} ${user.lastName}`.trim(),
            description: user.email,
            href: "/portal/admin/users",
          }))
        : []),
      ...(isAdminScope
        ? specialties.map((specialty) => ({
            type: "Specialties",
            id: specialty.id,
            label: specialty.name,
            description: "Especialidad clínica",
            href: "/portal/admin/specialties",
          }))
        : []),
    ];

    const sliced = results.slice(skip, skip + take);
    logger.info({
      event: "search.success",
      route: "/api/search",
      requestId,
      userId: sessionResult.user.id,
      status: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ results: sliced, items: sliced, page, pageSize, total: results.length });
  } catch (error) {
    Sentry.captureException(error);
    logger.error({
      event: "search.failed",
      route: "/api/search",
      requestId,
      userId: sessionResult.user.id,
      status: 500,
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse("No se pudo completar la búsqueda.", 500);
  }
}
