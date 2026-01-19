import type { PrismaClient } from "@prisma/client";

type PatientExportOptions = {
  includeHiddenClinical: boolean;
  take: number;
  skip: number;
};

export type PatientExportPayload = {
  patient: {
    id: string;
    userId: string;
    name: string;
    lastName: string;
    email: string;
    phone: string | null;
    documentId: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    insuranceProvider: string | null;
    insuranceStatus: string | null;
    address: string | null;
    city: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  appointments: Array<{
    id: string;
    status: string;
    reason: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    timeSlot: {
      startAt: Date;
      endAt: Date;
    };
    service: {
      id: string;
      name: string;
      priceCents: number;
    };
    professional: {
      id: string;
      name: string;
      lastName: string;
    } | null;
  }>;
  clinicalEpisodes: Array<{
    id: string;
    date: Date;
    reason: string | null;
    notes: string | null;
    diagnosis: string | null;
    treatmentPlan: string | null;
    visibleToPatient: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  allergies: Array<{
    id: string;
    substance: string;
    severity: string;
    notes: string | null;
    createdAt: Date;
  }>;
  consents: Array<{
    id: string;
    templateId: string;
    acceptedAt: Date;
  }>;
  meta: {
    take: number;
    skip: number;
  };
};

export async function buildPatientExport(
  prisma: PrismaClient,
  patientId: string,
  options: PatientExportOptions,
): Promise<PatientExportPayload | null> {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: patientId },
    include: { user: true },
  });

  if (!patient || !patient.user) {
    return null;
  }

  const clinicalWhere = options.includeHiddenClinical
    ? { patientId, deletedAt: null }
    : { patientId, deletedAt: null, visibleToPatient: true };

  const [appointments, clinicalEpisodes, allergies, consents] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId },
      include: {
        timeSlot: true,
        service: true,
        professional: { include: { user: true } },
      },
      orderBy: { timeSlot: { startAt: "desc" } },
      skip: options.skip,
      take: options.take,
    }),
    prisma.clinicalEpisode.findMany({
      where: clinicalWhere,
      orderBy: { date: "desc" },
      skip: options.skip,
      take: options.take,
    }),
    prisma.medicalAllergy.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
    }),
    prisma.signedConsent.findMany({
      where: { patientId },
      orderBy: { acceptedAt: "desc" },
      skip: options.skip,
      take: options.take,
    }),
  ]);

  return {
    patient: {
      id: patient.id,
      userId: patient.userId,
      name: patient.user.name,
      lastName: patient.user.lastName,
      email: patient.user.email,
      phone: patient.phone ?? null,
      documentId: patient.documentId ?? null,
      dateOfBirth: patient.dateOfBirth ?? null,
      gender: patient.gender ?? null,
      insuranceProvider: patient.insuranceProvider ?? null,
      insuranceStatus: patient.insuranceStatus ?? null,
      address: patient.address ?? null,
      city: patient.city ?? null,
      active: patient.active,
      createdAt: patient.user.createdAt,
      updatedAt: patient.user.updatedAt,
    },
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      status: appointment.status,
      reason: appointment.reason,
      notes: appointment.notes ?? null,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      timeSlot: {
        startAt: appointment.timeSlot.startAt,
        endAt: appointment.timeSlot.endAt,
      },
      service: {
        id: appointment.serviceId,
        name: appointment.service?.name ?? appointment.serviceName ?? "Servicio",
        priceCents: appointment.service?.priceCents ?? appointment.servicePriceCents ?? 0,
      },
      professional: appointment.professional?.user
        ? {
            id: appointment.professionalId,
            name: appointment.professional.user.name,
            lastName: appointment.professional.user.lastName,
          }
        : null,
    })),
    clinicalEpisodes: clinicalEpisodes.map((episode) => ({
      id: episode.id,
      date: episode.date,
      reason: episode.reason ?? null,
      notes: episode.notes ?? null,
      diagnosis: episode.diagnosis ?? null,
      treatmentPlan: episode.treatmentPlan ?? null,
      visibleToPatient: episode.visibleToPatient,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt,
    })),
    allergies: allergies.map((allergy) => ({
      id: allergy.id,
      substance: allergy.substance,
      severity: allergy.severity,
      notes: allergy.notes ?? null,
      createdAt: allergy.createdAt,
    })),
    consents: consents.map((consent) => ({
      id: consent.id,
      templateId: consent.templateId,
      acceptedAt: consent.acceptedAt,
    })),
    meta: {
      take: options.take,
      skip: options.skip,
    },
  };
}
