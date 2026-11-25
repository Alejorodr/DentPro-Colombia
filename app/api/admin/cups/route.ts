import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { isCatalogCupsCode } from "@/lib/regulatory/cups-odontologia";
import { refreshFutureInventoryForProfessional } from "@/lib/scheduling/slot-inventory";

/**
 * Catálogo CUPS de la clínica (DOG-42): qué procedimientos presta, con qué servicio se agendan y
 * qué profesionales los realizan. El catálogo en sí es estático (`lib/regulatory/cups-odontologia.ts`).
 */

const INVENTORY_REFRESH_DAYS = 45;

const updateProcedureSchema = z.object({
  cupsCode: z.string().refine(isCatalogCupsCode, "El código no está en el catálogo CUPS."),
  offered: z.boolean(),
  serviceId: z.string().uuid().nullable().optional(),
  professionalIds: z.array(z.string().uuid()).max(100).optional(),
});

async function requireAdmin() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return { error: errorResponse(sessionResult.error.message, sessionResult.error.status) };
  }
  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return { error: errorResponse("No autorizado.", roleError.status) };
  }
  return { user: sessionResult.user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const prisma = getPrismaClient();
  const [procedures, services, professionals] = await Promise.all([
    prisma.clinicProcedure.findMany({
      select: { cupsCode: true, serviceId: true, professionals: { select: { professionalId: true } } },
      orderBy: { cupsCode: "asc" },
    }),
    prisma.service.findMany({
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.professionalProfile.findMany({
      where: { active: true, user: { role: "PROFESIONAL" } },
      select: {
        id: true,
        specialty: { select: { name: true } },
        user: { select: { name: true, lastName: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return NextResponse.json({
    procedures: procedures.map((procedure) => ({
      cupsCode: procedure.cupsCode,
      serviceId: procedure.serviceId,
      professionalIds: procedure.professionals.map((item) => item.professionalId),
    })),
    services,
    professionals: professionals.map((professional) => ({
      id: professional.id,
      name: [professional.user.name, professional.user.lastName].filter(Boolean).join(" ") || "Sin nombre",
      specialty: professional.specialty?.name ?? null,
    })),
  });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { data: payload, error } = await parseJson(request, updateProcedureSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const actor = { userId: auth.user.id, role: auth.user.role };

  if (!payload.offered) {
    await prisma.clinicProcedure.deleteMany({ where: { cupsCode: payload.cupsCode } });
    await logAuditEvent({
      actor,
      action: "cups.procedure.removed",
      resourceType: "clinic_procedure",
      targetLabel: payload.cupsCode,
      status: "success",
    });
    return NextResponse.json({ procedure: null, createdAssignments: [] });
  }

  const serviceId = payload.serviceId ?? null;
  const professionalIds = [...new Set(payload.professionalIds ?? [])];

  if (serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } });
    if (!service) return errorResponse("El servicio no existe.", 400);
  }

  if (professionalIds.length > 0) {
    const found = await prisma.professionalProfile.count({
      where: { id: { in: professionalIds }, active: true, user: { role: "PROFESIONAL" } },
    });
    if (found !== professionalIds.length) {
      return errorResponse("Algún profesional no existe o no está activo.", 400);
    }
  }

  const { procedure, createdAssignments } = await prisma.$transaction(async (tx) => {
    const saved = await tx.clinicProcedure.upsert({
      where: { cupsCode: payload.cupsCode },
      create: { cupsCode: payload.cupsCode, serviceId },
      update: { serviceId },
    });

    await tx.professionalProcedure.deleteMany({ where: { procedureId: saved.id } });
    if (professionalIds.length > 0) {
      await tx.professionalProcedure.createMany({
        data: professionalIds.map((professionalId) => ({ professionalId, procedureId: saved.id })),
      });
    }

    // Quien realiza el procedimiento tiene que poder agendarse en su servicio. Solo se crean las
    // asignaciones que faltan: si el admin desactivó una a propósito en la agenda, se respeta.
    const created: string[] = [];
    if (serviceId && professionalIds.length > 0) {
      const existing = await tx.professionalService.findMany({
        where: { serviceId, professionalId: { in: professionalIds } },
        select: { professionalId: true },
      });
      const assigned = new Set(existing.map((item) => item.professionalId));
      const missing = professionalIds.filter((id) => !assigned.has(id));
      if (missing.length > 0) {
        await tx.professionalService.createMany({
          data: missing.map((professionalId) => ({ professionalId, serviceId })),
        });
        created.push(...missing);
      }
    }

    return { procedure: saved, createdAssignments: created };
  });

  if (createdAssignments.length > 0) {
    const rangeStart = new Date();
    rangeStart.setMinutes(0, 0, 0);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + INVENTORY_REFRESH_DAYS);
    for (const professionalId of createdAssignments) {
      await refreshFutureInventoryForProfessional({ professionalId, rangeStart, rangeEnd, prisma });
    }
  }

  await logAuditEvent({
    actor,
    action: "cups.procedure.saved",
    resourceType: "clinic_procedure",
    resourceId: procedure.id,
    targetLabel: payload.cupsCode,
    status: "success",
    metadata: {
      serviceId,
      professionalCount: professionalIds.length,
      createdAssignments: createdAssignments.length,
    },
  });

  return NextResponse.json({
    procedure: { cupsCode: procedure.cupsCode, serviceId: procedure.serviceId, professionalIds },
    createdAssignments,
  });
}
