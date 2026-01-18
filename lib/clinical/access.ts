import type { PrismaClient, ProfessionalProfile } from "@prisma/client";

export async function getProfessionalProfile(prisma: PrismaClient, userId: string) {
  return prisma.professionalProfile.findUnique({ where: { userId } });
}

export async function professionalHasPatientAccess(
  prisma: PrismaClient,
  professional: ProfessionalProfile,
  patientId: string,
) {
  const appointmentMatch = await prisma.appointment.findFirst({
    where: { patientId, professionalId: professional.id },
    select: { id: true },
  });

  if (appointmentMatch) {
    return true;
  }

  const episodeMatch = await prisma.clinicalEpisode.findFirst({
    where: { patientId, professionalId: professional.id, deletedAt: null },
    select: { id: true },
  });

  return Boolean(episodeMatch);
}

export async function professionalHasEpisodeAccess(
  prisma: PrismaClient,
  professional: ProfessionalProfile,
  episodeId: string,
) {
  const episode = await prisma.clinicalEpisode.findFirst({
    where: { id: episodeId, professionalId: professional.id, deletedAt: null },
    select: { id: true },
  });

  return Boolean(episode);
}
