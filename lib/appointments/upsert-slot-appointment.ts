import { Prisma, type PrismaClient } from "@prisma/client";

type AppointmentClient = Pick<PrismaClient, "appointment">;
type SlotAppointmentData = Omit<Prisma.AppointmentUncheckedCreateInput, "timeSlotId">;

function isActiveSlotConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function findTarget(prisma: AppointmentClient, timeSlotId: string) {
  // Preferir la cita activa del turno: actualizar una cancelada a un estado activo chocaría con
  // el índice parcial Appointment_timeSlotId_active_key si ya existe otra activa.
  const active = await prisma.appointment.findFirst({
    where: { timeSlotId, status: { not: "CANCELLED" } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (active) return active;
  return prisma.appointment.findFirst({
    where: { timeSlotId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Crea o actualiza "la" cita de un turno para los seeds (ops/test). timeSlotId ya no es único
 * (las canceladas liberan el turno), así que no hay upsert atómico de Prisma: dos seeds en
 * paralelo (workers de Playwright) podían crear la misma cita y fallar con P2002. Si la
 * creación pierde la carrera, se actualiza la cita activa que ganó.
 */
export async function upsertSlotAppointment(
  prisma: AppointmentClient,
  timeSlotId: string,
  data: SlotAppointmentData,
) {
  const target = await findTarget(prisma, timeSlotId);
  try {
    if (target) {
      return await prisma.appointment.update({ where: { id: target.id }, data });
    }
    return await prisma.appointment.create({ data: { ...data, timeSlotId } });
  } catch (error) {
    if (!isActiveSlotConflict(error)) throw error;
    const winner = await prisma.appointment.findFirst({
      where: { timeSlotId, status: { not: "CANCELLED" } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (!winner) throw error;
    return prisma.appointment.update({ where: { id: winner.id }, data });
  }
}
