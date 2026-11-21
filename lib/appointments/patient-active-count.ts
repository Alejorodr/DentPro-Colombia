import { getPrismaClient } from "@/lib/prisma";
import { countActiveFutureAppointments } from "@/lib/appointments/booking-limits";

/**
 * Active future appointments (SCHEDULED/CONFIRMED) for the patient linked to a
 * user. Used by patient booking pages to pre-empt the server-side booking cap.
 * Returns 0 when the profile is missing or the database is unreachable — the
 * API still enforces the cap, this is only a UX hint.
 */
export async function getActiveAppointmentCountForUser(userId: string | undefined): Promise<number> {
  if (!userId) return 0;
  try {
    const prisma = getPrismaClient();
    const patient = await prisma.patientProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!patient) return 0;
    return await countActiveFutureAppointments(prisma, patient.id);
  } catch {
    return 0;
  }
}
