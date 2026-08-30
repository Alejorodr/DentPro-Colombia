/// <reference types="node" />

import { createHash } from "node:crypto";

import { ClinicalNoteType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getPrismaClient } from "../../lib/prisma";

const STAGING_CONFIRMATION = "synthetic-v1";

const ids = {
  specialty: "00000000-0000-4000-8000-000000000001",
  service: "00000000-0000-4000-8000-000000000002",
  admin: "00000000-0000-4000-8000-000000000101",
  professionalA: "00000000-0000-4000-8000-000000000102",
  professionalB: "00000000-0000-4000-8000-000000000103",
  receptionist: "00000000-0000-4000-8000-000000000104",
  patientA: "00000000-0000-4000-8000-000000000105",
  patientB: "00000000-0000-4000-8000-000000000106",
  disabled: "00000000-0000-4000-8000-000000000107",
  patientProfileA: "00000000-0000-4000-8000-000000000201",
  patientProfileB: "00000000-0000-4000-8000-000000000202",
  disabledPatientProfile: "00000000-0000-4000-8000-000000000203",
  professionalProfileA: "00000000-0000-4000-8000-000000000204",
  professionalProfileB: "00000000-0000-4000-8000-000000000205",
  timeSlot: "00000000-0000-4000-8000-000000000301",
  appointment: "00000000-0000-4000-8000-000000000302",
  episode: "00000000-0000-4000-8000-000000000303",
  note: "00000000-0000-4000-8000-000000000304",
  attachment: "00000000-0000-4000-8000-000000000305",
} as const;

const identities = [
  { id: ids.admin, email: stableEmail("sec-admin"), name: "Security", lastName: "Admin", role: Role.ADMINISTRADOR },
  { id: ids.professionalA, email: stableEmail("sec-professional-a"), name: "Synthetic", lastName: "Professional A", role: Role.PROFESIONAL },
  { id: ids.professionalB, email: stableEmail("sec-professional-b"), name: "Synthetic", lastName: "Professional B", role: Role.PROFESIONAL },
  { id: ids.receptionist, email: stableEmail("sec-receptionist"), name: "Synthetic", lastName: "Receptionist", role: Role.RECEPCIONISTA },
  { id: ids.patientA, email: stableEmail("sec-patient-a"), name: "Synthetic", lastName: "Patient A", role: Role.PACIENTE },
  { id: ids.patientB, email: stableEmail("sec-patient-b"), name: "Synthetic", lastName: "Patient B", role: Role.PACIENTE },
  { id: ids.disabled, email: stableEmail("sec-disabled"), name: "Synthetic", lastName: "Disabled", role: Role.PACIENTE },
] as const;

function requireStagingEnvironment() {
  if (process.env.SECURITY_STAGING !== "1") {
    throw new Error("Refusing to seed: set SECURITY_STAGING=1 explicitly.");
  }
  if (process.env.SECURITY_STAGING_CONFIRMATION !== STAGING_CONFIRMATION) {
    throw new Error(`Refusing to seed: set SECURITY_STAGING_CONFIRMATION=${STAGING_CONFIRMATION}.`);
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed a production environment.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("Refusing to seed: DATABASE_URL is required and must target isolated staging.");
  }
}

function requireSeedPassword() {
  const password = process.env.SECURITY_STAGING_SEED_PASSWORD;
  if (!password || password.length < 16) {
    throw new Error("Set SECURITY_STAGING_SEED_PASSWORD to a staging-only value of at least 16 characters.");
  }
  return password;
}

function stableEmail(slug: string) {
  return `${slug}@staging.invalid`;
}

async function main() {
  requireStagingEnvironment();
  const passwordHash = await bcrypt.hash(requireSeedPassword(), 12);
  const prisma = getPrismaClient();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.specialty.upsert({
        where: { id: ids.specialty },
        update: { name: "Security Staging General Dentistry", defaultSlotDurationMinutes: 30, active: true },
        create: {
          id: ids.specialty,
          name: "Security Staging General Dentistry",
          defaultSlotDurationMinutes: 30,
          active: true,
        },
      });

      await tx.service.upsert({
        where: { id: ids.service },
        update: { name: "Security Staging Checkup", specialtyId: ids.specialty, active: true },
        create: {
          id: ids.service,
          name: "Security Staging Checkup",
          description: "Synthetic security test service",
          priceCents: 100,
          durationMinutes: 30,
          specialtyId: ids.specialty,
          active: true,
        },
      });

      for (const user of identities) {
        await tx.user.upsert({
          where: { id: user.id },
          update: { email: user.email, name: user.name, lastName: user.lastName, role: user.role, passwordHash, active: true },
          create: { ...user, passwordHash, active: true },
        });
      }

      await tx.professionalProfile.upsert({
        where: { userId: ids.professionalA },
        update: { specialtyId: ids.specialty, active: true },
        create: { id: ids.professionalProfileA, userId: ids.professionalA, specialtyId: ids.specialty, active: true },
      });
      await tx.professionalProfile.upsert({
        where: { userId: ids.professionalB },
        update: { specialtyId: ids.specialty, active: true },
        create: { id: ids.professionalProfileB, userId: ids.professionalB, specialtyId: ids.specialty, active: true },
      });

      for (const patient of [
        { id: ids.patientProfileA, userId: ids.patientA, code: "SEC-STG-PATIENT-A" },
        { id: ids.patientProfileB, userId: ids.patientB, code: "SEC-STG-PATIENT-B" },
        { id: ids.disabledPatientProfile, userId: ids.disabled, code: "SEC-STG-DISABLED" },
      ]) {
        await tx.patientProfile.upsert({
          where: { userId: patient.userId },
          update: { patientCode: patient.code, active: true, city: "Synthetic City" },
          create: {
            id: patient.id,
            userId: patient.userId,
            patientCode: patient.code,
            dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
            gender: "X",
            city: "Synthetic City",
            active: true,
          },
        });
      }

      await tx.timeSlot.upsert({
        where: { professionalId_startAt_endAt: { professionalId: ids.professionalProfileA, startAt: new Date("2099-01-05T14:00:00.000Z"), endAt: new Date("2099-01-05T14:30:00.000Z") } },
        update: { status: "BOOKED" },
        create: {
          id: ids.timeSlot,
          professionalId: ids.professionalProfileA,
          startAt: new Date("2099-01-05T14:00:00.000Z"),
          endAt: new Date("2099-01-05T14:30:00.000Z"),
          status: "BOOKED",
        },
      });

      await tx.appointment.upsert({
        where: { id: ids.appointment },
        update: { patientId: ids.patientProfileA, professionalId: ids.professionalProfileA, serviceId: ids.service, timeSlotId: ids.timeSlot, reason: "Synthetic security fixture" },
        create: {
          id: ids.appointment,
          patientId: ids.patientProfileA,
          professionalId: ids.professionalProfileA,
          serviceId: ids.service,
          timeSlotId: ids.timeSlot,
          reason: "Synthetic security fixture",
          status: "CONFIRMED",
        },
      });

      await tx.clinicalEpisode.upsert({
        where: { id: ids.episode },
        update: { patientId: ids.patientProfileA, professionalId: ids.professionalProfileA, appointmentId: ids.appointment, reason: "Synthetic security fixture", visibleToPatient: true, deletedAt: null },
        create: {
          id: ids.episode,
          patientId: ids.patientProfileA,
          professionalId: ids.professionalProfileA,
          appointmentId: ids.appointment,
          date: new Date("2099-01-05T14:00:00.000Z"),
          reason: "Synthetic security fixture",
          notes: "Synthetic data only",
          visibleToPatient: true,
          createdByUserId: ids.professionalA,
        },
      });

      await tx.clinicalNote.upsert({
        where: { id: ids.note },
        update: { episodeId: ids.episode, authorUserId: ids.professionalA, content: "Synthetic note", deletedAt: null },
        create: { id: ids.note, episodeId: ids.episode, authorUserId: ids.professionalA, type: ClinicalNoteType.OBSERVATION, content: "Synthetic note" },
      });

      await tx.clinicalAttachment.upsert({
        where: { id: ids.attachment },
        update: { episodeId: ids.episode, patientId: ids.patientProfileA, uploadedByUserId: ids.professionalA, storageKey: `clinical-private/security-staging/${ids.attachment}/synthetic.txt`, filename: "synthetic.txt", mimeType: "text/plain", size: 17, checksum: createHash("sha256").update("synthetic fixture").digest("hex"), deletedAt: null },
        create: {
          id: ids.attachment,
          episodeId: ids.episode,
          patientId: ids.patientProfileA,
          uploadedByUserId: ids.professionalA,
          filename: "synthetic.txt",
          mimeType: "text/plain",
          size: 17,
          storageKey: `clinical-private/security-staging/${ids.attachment}/synthetic.txt`,
          checksum: createHash("sha256").update("synthetic fixture").digest("hex"),
          visibleToPatient: true,
        },
      });
    });

    console.log(JSON.stringify({
      status: "seeded",
      dataset: STAGING_CONFIRMATION,
      roles: Object.values(Role),
      identities: identities.map(({ email, role }) => ({ email, role })),
      syntheticRecords: { patients: 3, professionals: 2, appointments: 1, clinicalEpisodes: 1, attachments: 1 },
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Security staging seed failed.");
  process.exitCode = 1;
});
