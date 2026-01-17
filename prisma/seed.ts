import bcrypt from "bcryptjs";
import {
  AllergySeverity,
  AppointmentStatus,
  AttachmentKind,
  InsuranceStatus,
  PrescriptionItemType,
  PrismaClient,
  Role,
  TimeSlotStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

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
    where: {
      professionalId,
      startAt,
      endAt,
    },
  });

  if (existing) {
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

async function ensureProfessionalSlots({
  professionalId,
  startAt,
  slots,
  durationMinutes,
}: {
  professionalId: string;
  startAt: Date;
  slots: number;
  durationMinutes: number;
}) {
  const slotTimes = buildSlotTimes(startAt, slots, durationMinutes);

  for (const slotTime of slotTimes) {
    await ensureTimeSlot({
      professionalId,
      startAt: slotTime.startAt,
      endAt: slotTime.endAt,
      status: TimeSlotStatus.AVAILABLE,
    });
  }
}

async function ensureProfessionalSlotsForDay({
  professionalId,
  day,
  durationMinutes,
}: {
  professionalId: string;
  day: Date;
  durationMinutes: number;
}) {
  const startAt = new Date(day);
  startAt.setHours(8, 0, 0, 0);
  await ensureProfessionalSlots({
    professionalId,
    startAt,
    slots: 12,
    durationMinutes,
  });
}

async function ensureProfessionalSlotsInWeek({
  professionalId,
  startDay,
  durationMinutes,
}: {
  professionalId: string;
  startDay: Date;
  durationMinutes: number;
}) {
  for (let index = 0; index < 5; index += 1) {
    const day = new Date(startDay);
    day.setDate(startDay.getDate() + index);
    await ensureProfessionalSlotsForDay({ professionalId, day, durationMinutes });
  }
}

async function assignDefaultSlots(professionalId: string, durationMinutes: number) {
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(today.getDate() + 1);
  await ensureProfessionalSlotsInWeek({
    professionalId,
    startDay,
    durationMinutes,
  });
}

async function ensureProfessional({
  email,
  name,
  lastName,
  specialtyName,
}: {
  email: string;
  name: string;
  lastName: string;
  specialtyName: string;
}) {
  const professional = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.PROFESIONAL,
    },
    create: {
      email,
      name,
      lastName,
      passwordHash: await bcrypt.hash(requireEnv("PROFESSIONAL_SEED_PASSWORD"), 10),
      role: Role.PROFESIONAL,
      professional: {
        create: {
          specialty: {
            connect: {
              name: specialtyName,
            },
          },
          active: true,
        },
      },
    },
    include: {
      professional: true,
    },
  });

  if (professional.professional) {
    const slotDurationMinutes = professional.professional.slotDurationMinutes ?? 30;
    await assignDefaultSlots(professional.professional.id, slotDurationMinutes);
  }

  return professional;
}

async function ensurePatient({
  email,
  name,
  lastName,
  dateOfBirth,
  gender,
  phone,
  documentId,
  insuranceProvider,
  insuranceStatus,
  address,
  city,
  patientCode,
}: {
  email: string;
  name: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  phone: string;
  documentId: string;
  insuranceProvider: string;
  insuranceStatus: InsuranceStatus;
  address: string;
  city: string;
  patientCode: string;
}) {
  const patient = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.PACIENTE,
    },
    create: {
      email,
      name,
      lastName,
      passwordHash: await bcrypt.hash(requireEnv("PATIENT_SEED_PASSWORD"), 10),
      role: Role.PACIENTE,
      patient: {
        create: {
          dateOfBirth,
          gender,
          phone,
          documentId,
          insuranceProvider,
          insuranceStatus,
          address,
          city,
          patientCode,
        },
      },
    },
    include: {
      patient: true,
    },
  });

  return patient;
}

async function ensureSpecialties() {
  for (const specialty of DEFAULT_SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { name: specialty.name },
      update: {
        defaultSlotDurationMinutes: specialty.defaultSlotDurationMinutes,
      },
      create: specialty,
    });
  }
}

async function ensureServices() {
  for (const service of DEFAULT_SERVICES) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {
        description: service.description,
        priceCents: service.priceCents,
        durationMinutes: service.durationMinutes,
      },
      create: {
        name: service.name,
        description: service.description,
        priceCents: service.priceCents,
        durationMinutes: service.durationMinutes,
        specialty: {
          connect: {
            name: service.specialtyName,
          },
        },
      },
    });
  }
}

async function ensureAdminUser() {
  const adminEmail = requireEnv("ADMIN_SEED_EMAIL");

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMINISTRADOR,
    },
    create: {
      email: adminEmail,
      name: "Admin",
      lastName: "DentPro",
      passwordHash: await bcrypt.hash(requireEnv("ADMIN_SEED_PASSWORD"), 10),
      role: Role.ADMINISTRADOR,
    },
  });
}

async function ensureReceptions() {
  const receptionistEmail = requireEnv("RECEPTIONIST_SEED_EMAIL");

  await prisma.user.upsert({
    where: { email: receptionistEmail },
    update: {
      role: Role.RECEPCIONISTA,
    },
    create: {
      email: receptionistEmail,
      name: "Marta",
      lastName: "Zuluaga",
      passwordHash: await bcrypt.hash(requireEnv("RECEPTIONIST_SEED_PASSWORD"), 10),
      role: Role.RECEPCIONISTA,
    },
  });
}

async function ensurePrescriptions(appointmentId: string) {
  const prescriptions = await prisma.prescription.findMany({
    where: {
      appointmentId,
    },
  });

  if (prescriptions.length > 0) {
    return;
  }

  await prisma.prescription.create({
    data: {
      appointmentId,
      items: {
        create: [
          {
            name: "Ibuprofeno 400mg",
            dosage: "1 tableta cada 8 horas",
            type: PrescriptionItemType.MEDICATION,
          },
          {
            name: "Enjuague bucal",
            dosage: "2 veces al día",
            type: PrescriptionItemType.PROCEDURE,
          },
        ],
      },
    },
  });
}

async function ensureAppointment(professionalId: string, patientId: string, serviceId: string) {
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      professionalId,
      patientId,
    },
  });

  if (existingAppointment) {
    return existingAppointment;
  }

  const timeSlot = await prisma.timeSlot.findFirst({
    where: {
      professionalId,
      status: TimeSlotStatus.AVAILABLE,
    },
  });

  if (!timeSlot) {
    return null;
  }

  return prisma.appointment.create({
    data: {
      status: AppointmentStatus.PENDING,
      reason: "Dolor de encías",
      professional: {
        connect: {
          id: professionalId,
        },
      },
      patient: {
        connect: {
          id: patientId,
        },
      },
      timeSlot: {
        connect: {
          id: timeSlot.id,
        },
      },
      service: {
        connect: {
          id: serviceId,
        },
      },
    },
  });
}

async function ensureAttachments(appointmentId: string) {
  const attachments = await prisma.attachment.findMany({
    where: {
      appointmentId,
    },
  });

  if (attachments.length > 0) {
    return;
  }

  await prisma.attachment.create({
    data: {
      appointmentId,
      filename: "radiografia-inicial.png",
      url: "https://example.com/radiografia-inicial.png",
      kind: AttachmentKind.XRAY,
    },
  });
}

async function ensureAllergies(patientId: string) {
  const allergies = await prisma.medicalAllergy.findMany({
    where: {
      patientId,
    },
  });

  if (allergies.length > 0) {
    return;
  }

  await prisma.medicalAllergy.createMany({
    data: [
      {
        patientId,
        substance: "Penicilina",
        severity: AllergySeverity.MEDIUM,
        notes: "Reacción leve en la piel.",
      },
      {
        patientId,
        substance: "Látex",
        severity: AllergySeverity.HIGH,
        notes: "Hinchazón y dificultad para respirar.",
      },
    ],
  });
}

async function ensureNotifications({
  patientUserId,
  professionalUserId,
}: {
  patientUserId: string;
  professionalUserId: string;
}) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId: {
        in: [patientUserId, professionalUserId],
      },
    },
  });

  if (notifications.length > 0) {
    return;
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: patientUserId,
        type: "APPOINTMENT_REMINDER",
        title: "Recordatorio de cita",
        body: "Recuerda tu cita mañana a las 10:00am.",
      },
      {
        userId: patientUserId,
        type: "FOLLOW_UP",
        title: "Seguimiento",
        body: "¿Cómo te sientes después del procedimiento?",
      },
      {
        userId: professionalUserId,
        type: "NEW_APPOINTMENT",
        title: "Nueva cita asignada",
        body: "Tienes una nueva cita en agenda.",
      },
    ],
  });
}

async function runSeed() {
  await prisma.$connect();

  try {
    await ensureSpecialties();
    await ensureServices();
    await ensureAdminUser();
    await ensureReceptions();

    for (const professional of PROFESSIONAL_SEED) {
      await ensureProfessional(professional);
    }

    for (const patient of PATIENT_SEED) {
      await ensurePatient(patient);
    }

    const firstProfessional = await prisma.professionalProfile.findFirst();
    const firstPatient = await prisma.patientProfile.findFirst();
    const firstService = await prisma.service.findFirst();

    if (firstProfessional && firstPatient && firstService) {
      const appointment =
        (await ensureAppointment(firstProfessional.id, firstPatient.id, firstService.id)) ??
        (await prisma.appointment.findFirst({
          where: {
            professionalId: firstProfessional.id,
            patientId: firstPatient.id,
          },
        }));

      if (appointment) {
        await ensureAttachments(appointment.id);
        await ensurePrescriptions(appointment.id);
      }

      await ensureAllergies(firstPatient.id);
      await ensureNotifications({
        patientUserId: firstPatient.userId,
        professionalUserId: firstProfessional.userId,
      });
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runSeed()
  .then(() => {
    console.log("Seed finalizado correctamente.");
  })
  .catch(async (error) => {
    console.error("Error ejecutando seed:", error);
    process.exitCode = 1;
  });
