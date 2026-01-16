import bcrypt from "bcryptjs";
import {
  AllergySeverity,
  AppointmentStatus,
  AttachmentKind,
  InsuranceStatus,
  Prisma,
  PrescriptionItemType,
  PrismaClient,
  Role,
  TimeSlotStatus,
} from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
} as Prisma.PrismaClientOptions);

const DEFAULT_SPECIALTIES = [
  { name: "Odontología General", defaultSlotDurationMinutes: 30 },
  { name: "Ortodoncia", defaultSlotDurationMinutes: 45 },
  { name: "Endodoncia", defaultSlotDurationMinutes: 60 },
];

const DEFAULT_SERVICES = [
  {
    name: "Limpieza Dental",
    description: "Profilaxis y pulido dental.",
    priceCents: 80000,
    durationMinutes: 30,
    specialtyName: "Odontología General",
  },
  {
    name: "Blanqueamiento",
    description: "Tratamiento estético para aclarar el esmalte.",
    priceCents: 250000,
    durationMinutes: 60,
    specialtyName: "Odontología General",
  },
  {
    name: "Endodoncia Básica",
    description: "Tratamiento de conductos para aliviar dolor.",
    priceCents: 180000,
    durationMinutes: 60,
    specialtyName: "Endodoncia",
  },
  {
    name: "Ortodoncia Inicial",
    description: "Evaluación y ajuste de brackets.",
    priceCents: 140000,
    durationMinutes: 45,
    specialtyName: "Ortodoncia",
  },
  {
    name: "Implante Dental",
    description: "Colocación de implante dental.",
    priceCents: 450000,
    durationMinutes: 90,
    specialtyName: "Odontología General",
  },
];

const PROFESSIONAL_SEED = [
  {
    email: "demo-profesional@dentpro.co",
    name: "Laura",
    lastName: "Rojas",
    specialtyName: "Odontología General",
  },
  {
    email: "demo-profesional2@dentpro.co",
    name: "Juan",
    lastName: "Martinez",
    specialtyName: "Endodoncia",
  },
  {
    email: "demo-profesional3@dentpro.co",
    name: "Elena",
    lastName: "Gomez",
    specialtyName: "Ortodoncia",
  },
];

const PATIENT_SEED = [
  {
    email: "demo-paciente@dentpro.co",
    name: "Andrea",
    lastName: "Gomez",
    dateOfBirth: new Date(1992, 5, 12),
    gender: "Femenino",
    phone: "+57 310 555 9812",
    documentId: "CC10928312",
    insuranceProvider: "Colsanitas Dental Plan",
    insuranceStatus: InsuranceStatus.ACTIVE,
    address: "Cra. 7 #13-180",
    city: "Chía, Cundinamarca",
    patientCode: "8930211",
  },
  {
    email: "paciente.luisa@dentpro.co",
    name: "Luisa",
    lastName: "Alvarez",
    dateOfBirth: new Date(1988, 9, 4),
    gender: "Femenino",
    phone: "+57 313 222 1109",
    documentId: "CC4488123",
    insuranceProvider: "Sura Odonto",
    insuranceStatus: InsuranceStatus.ACTIVE,
    address: "Av. Pradilla #12-40",
    city: "Chía, Cundinamarca",
    patientCode: "9341120",
  },
  {
    email: "paciente.carlos@dentpro.co",
    name: "Carlos",
    lastName: "Perez",
    dateOfBirth: new Date(1985, 2, 21),
    gender: "Masculino",
    phone: "+57 320 771 2200",
    documentId: "CC5589012",
    insuranceProvider: "Coomeva",
    insuranceStatus: InsuranceStatus.UNKNOWN,
    address: "Cra. 5 #12-30",
    city: "Cajicá, Cundinamarca",
    patientCode: "5521990",
  },
  {
    email: "paciente.ana@dentpro.co",
    name: "Ana",
    lastName: "Silva",
    dateOfBirth: new Date(1997, 10, 2),
    gender: "Femenino",
    phone: "+57 301 662 1031",
    documentId: "CC7722331",
    insuranceProvider: "Compensar",
    insuranceStatus: InsuranceStatus.ACTIVE,
    address: "Calle 9 #12-22",
    city: "Bogotá, Cundinamarca",
    patientCode: "1102919",
  },
  {
    email: "paciente.maria@dentpro.co",
    name: "Maria",
    lastName: "Rodriguez",
    dateOfBirth: new Date(1990, 8, 14),
    gender: "Femenino",
    phone: "+57 314 550 8844",
    documentId: "CC3321129",
    insuranceProvider: "Sanitas Dental",
    insuranceStatus: InsuranceStatus.ACTIVE,
    address: "Av. Chilacos #8-88",
    city: "Chía, Cundinamarca",
    patientCode: "7741239",
  },
  {
    email: "paciente.jorge@dentpro.co",
    name: "Jorge",
    lastName: "Castro",
    dateOfBirth: new Date(1979, 3, 19),
    gender: "Masculino",
    phone: "+57 311 902 3377",
    documentId: "CC9902123",
    insuranceProvider: "Medisanitas",
    insuranceStatus: InsuranceStatus.INACTIVE,
    address: "Calle 4 #10-66",
    city: "Zipaquirá, Cundinamarca",
    patientCode: "3302219",
  },
];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta configurar ${name} para ejecutar el seed.`);
  }
  return value;
}

function buildSlotTimes(start: Date, count: number, durationMinutes: number): Array<{ startAt: Date; endAt: Date }> {
  const slots: Array<{ startAt: Date; endAt: Date }> = [];
  let current = new Date(start);

  for (let index = 0; index < count; index += 1) {
    const startAt = new Date(current);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
    slots.push({ startAt, endAt });
    current = endAt;
  }

  return slots;
}

async function ensureTimeSlot({
  professionalId,
  startAt,
  endAt,
  status,
}: {
  professionalId: string;
  startAt: Date;
  endAt: Date;
  status: TimeSlotStatus;
}) {
  const existing = await prisma.timeSlot.findFirst({
    where: { professionalId, startAt },
  });

  if (existing) {
    if (existing.status !== status || existing.endAt.getTime() !== endAt.getTime()) {
      return prisma.timeSlot.update({
        where: { id: existing.id },
        data: { status, endAt },
      });
    }
    return existing;
  }

  return prisma.timeSlot.create({
    data: {
      professionalId,
      startAt,
      endAt,
      status,
    },
  });
}

async function main() {
  const adminEmail = requireEnv("SEED_ADMIN_EMAIL");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();

  const passwordHash = adminPassword ? await bcrypt.hash(adminPassword, 12) : null;

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
    select: { id: true },
  });

  if (!existingAdmin && !passwordHash) {
    throw new Error("SEED_ADMIN_PASSWORD es obligatorio para crear el usuario admin por primera vez.");
  }

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: "Admin",
      lastName: "DentPro",
      ...(passwordHash ? { passwordHash } : {}),
      role: Role.ADMINISTRADOR,
    },
    create: {
      email: adminEmail.toLowerCase(),
      name: "Admin",
      lastName: "DentPro",
      passwordHash: passwordHash!,
      role: Role.ADMINISTRADOR,
    },
  });

  const demoPasswordHash = await bcrypt.hash("DentProDemo!1", 12);
  const receptionistPasswordHash = await bcrypt.hash("RecepDentPro!1", 12);

  const receptionistUser = await prisma.user.upsert({
    where: { email: "demo-recepcion@dentpro.co" },
    update: {
      name: "Diana",
      lastName: "Mora",
      role: Role.RECEPCIONISTA,
      passwordHash: receptionistPasswordHash,
    },
    create: {
      email: "demo-recepcion@dentpro.co",
      name: "Diana",
      lastName: "Mora",
      role: Role.RECEPCIONISTA,
      passwordHash: receptionistPasswordHash,
    },
  });

  const specialties = [] as Array<{ id: string; name: string; defaultSlotDurationMinutes: number }>;
  for (const specialty of DEFAULT_SPECIALTIES) {
    const record = await prisma.specialty.upsert({
      where: { name: specialty.name },
      update: { defaultSlotDurationMinutes: specialty.defaultSlotDurationMinutes, active: true },
      create: { ...specialty },
    });
    specialties.push(record);
  }

  const serviceRecords = await Promise.all(
    DEFAULT_SERVICES.map((service) => {
      const specialtyForService = specialties.find((item) => item.name === service.specialtyName);
      return prisma.service.upsert({
        where: { name: service.name },
        update: {
          description: service.description,
          priceCents: service.priceCents,
          durationMinutes: service.durationMinutes,
          active: true,
          specialtyId: specialtyForService?.id ?? null,
        },
        create: {
          name: service.name,
          description: service.description,
          priceCents: service.priceCents,
          durationMinutes: service.durationMinutes,
          active: true,
          specialtyId: specialtyForService?.id ?? null,
        },
      });
    }),
  );

  const professionalProfiles = await Promise.all(
    PROFESSIONAL_SEED.map(async (professional) => {
      const professionalUser = await prisma.user.upsert({
        where: { email: professional.email },
        update: {
          name: professional.name,
          lastName: professional.lastName,
          role: Role.PROFESIONAL,
          passwordHash: demoPasswordHash,
        },
        create: {
          email: professional.email,
          name: professional.name,
          lastName: professional.lastName,
          role: Role.PROFESIONAL,
          passwordHash: demoPasswordHash,
        },
      });

      const specialty = specialties.find((item) => item.name === professional.specialtyName) ?? specialties[0];

      return prisma.professionalProfile.upsert({
        where: { userId: professionalUser.id },
        update: {
          specialtyId: specialty.id,
          slotDurationMinutes: specialty.defaultSlotDurationMinutes,
          active: true,
        },
        create: {
          userId: professionalUser.id,
          specialtyId: specialty.id,
          slotDurationMinutes: specialty.defaultSlotDurationMinutes,
          active: true,
        },
      });
    }),
  );

  const patientProfiles = await Promise.all(
    PATIENT_SEED.map(async (patient) => {
      const patientUser = await prisma.user.upsert({
        where: { email: patient.email },
        update: {
          name: patient.name,
          lastName: patient.lastName,
          role: Role.PACIENTE,
          passwordHash: demoPasswordHash,
        },
        create: {
          email: patient.email,
          name: patient.name,
          lastName: patient.lastName,
          role: Role.PACIENTE,
          passwordHash: demoPasswordHash,
        },
      });

      return prisma.patientProfile.upsert({
        where: { userId: patientUser.id },
        update: {
          phone: patient.phone,
          documentId: patient.documentId,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          insuranceProvider: patient.insuranceProvider,
          insuranceStatus: patient.insuranceStatus,
          address: patient.address,
          city: patient.city,
          patientCode: patient.patientCode,
          avatarUrl: null,
          active: true,
        },
        create: {
          userId: patientUser.id,
          phone: patient.phone,
          documentId: patient.documentId,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          insuranceProvider: patient.insuranceProvider,
          insuranceStatus: patient.insuranceStatus,
          address: patient.address,
          city: patient.city,
          patientCode: patient.patientCode,
          avatarUrl: null,
          active: true,
        },
      });
    }),
  );

  const dayOffsets = [0, 1, 3, 8];
  const slotPlan = [TimeSlotStatus.BOOKED, TimeSlotStatus.AVAILABLE, TimeSlotStatus.BREAK, TimeSlotStatus.BOOKED];
  const appointmentStatuses = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.COMPLETED,
  ];
  let appointmentIndex = 0;

  for (const profile of professionalProfiles) {
    const slotDuration = profile.slotDurationMinutes ?? 30;
    for (const offset of dayOffsets) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() + offset);
      dayStart.setHours(8, 0, 0, 0);

      const slots = buildSlotTimes(dayStart, slotPlan.length, slotDuration);

      for (const [index, slot] of slots.entries()) {
        const plannedStatus = slotPlan[index];
        const appointmentStatus =
          plannedStatus === TimeSlotStatus.BOOKED
            ? appointmentStatuses[appointmentIndex % appointmentStatuses.length]
            : null;
        const slotStatus =
          appointmentStatus === AppointmentStatus.CANCELLED
            ? TimeSlotStatus.AVAILABLE
            : plannedStatus;

        const timeSlot = await ensureTimeSlot({
          professionalId: profile.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
          status: slotStatus,
        });

        if (plannedStatus === TimeSlotStatus.BOOKED && appointmentStatus) {
          const patient = patientProfiles[appointmentIndex % patientProfiles.length];
          const service = serviceRecords[appointmentIndex % serviceRecords.length];
          await prisma.appointment.upsert({
            where: { timeSlotId: timeSlot.id },
            update: {
              patientId: patient.id,
              professionalId: profile.id,
              serviceId: service.id,
              serviceName: service.name,
              servicePriceCents: service.priceCents,
              reason: service.name,
              status: appointmentStatus,
              checkedInAt: appointmentStatus === AppointmentStatus.COMPLETED ? slot.startAt : null,
            },
            create: {
              patientId: patient.id,
              professionalId: profile.id,
              timeSlotId: timeSlot.id,
              serviceId: service.id,
              serviceName: service.name,
              servicePriceCents: service.priceCents,
              reason: service.name,
              status: appointmentStatus,
              checkedInAt: appointmentStatus === AppointmentStatus.COMPLETED ? slot.startAt : null,
            },
          });

          appointmentIndex += 1;
        }
      }
    }
  }

  const primaryProfessional = professionalProfiles[0];
  const primaryPatient = patientProfiles[0];

  if (primaryProfessional && primaryPatient) {
    const existingAllergy = await prisma.medicalAllergy.findFirst({
      where: { patientId: primaryPatient.id, substance: "Penicilina" },
    });

    if (!existingAllergy) {
      await prisma.medicalAllergy.create({
        data: {
          patientId: primaryPatient.id,
          substance: "Penicilina",
          severity: AllergySeverity.CRITICAL,
          notes: "Reacción severa reportada.",
        },
      });
    }

    const existingRule = await prisma.availabilityRule.findFirst({
      where: { professionalId: primaryProfessional.id },
    });

    if (!existingRule) {
      await prisma.availabilityRule.create({
        data: {
          professionalId: primaryProfessional.id,
          rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
          startTime: "09:00",
          endTime: "18:00",
          timezone: "America/Bogota",
          active: true,
        },
      });
    }

    const recentAppointments = await prisma.appointment.findMany({
      where: { professionalId: primaryProfessional.id },
      include: { timeSlot: true },
      orderBy: { timeSlot: { startAt: "asc" } },
      take: 3,
    });

    const appointmentForNotes = recentAppointments[0];
    if (appointmentForNotes) {
      const existingNote = await prisma.clinicalNote.findFirst({
        where: { appointmentId: appointmentForNotes.id },
      });

      if (!existingNote) {
        await prisma.clinicalNote.create({
          data: {
            appointmentId: appointmentForNotes.id,
            authorUserId: primaryProfessional.userId,
            content:
              "Paciente reporta sensibilidad leve en cuadrante superior izquierdo. Se recomienda seguimiento en 2 semanas.",
          },
        });
      }

      const prescription = await prisma.prescription.upsert({
        where: { appointmentId: appointmentForNotes.id },
        update: {},
        create: { appointmentId: appointmentForNotes.id },
      });

      const existingItems = await prisma.prescriptionItem.findFirst({
        where: { prescriptionId: prescription.id },
      });

      if (!existingItems) {
        await prisma.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            type: PrescriptionItemType.MEDICATION,
            name: "Ibuprofeno",
            dosage: "400mg",
            frequency: "Cada 8 horas",
            instructions: "Tomar con alimentos.",
          },
        });
      }

      const existingAttachment = await prisma.attachment.findFirst({
        where: { appointmentId: appointmentForNotes.id, kind: AttachmentKind.XRAY },
      });

      if (!existingAttachment) {
        await prisma.attachment.create({
          data: {
            appointmentId: appointmentForNotes.id,
            patientId: appointmentForNotes.patientId,
            kind: AttachmentKind.XRAY,
            filename: "Radiografia_panorama.pdf",
            mimeType: "application/pdf",
            url: "https://example.com/radiografia-panorama",
          },
        });
      }
    }
  }

  console.log("Seed completado:");
  console.log(`- Admin: ${adminUser.email}`);
  console.log(`- Recepción demo: ${receptionistUser.email}`);
  console.log(`- Profesionales demo: ${PROFESSIONAL_SEED.map((item) => item.email).join(", ")}`);
  console.log(`- Pacientes demo: ${PATIENT_SEED.map((item) => item.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error("Error durante el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
