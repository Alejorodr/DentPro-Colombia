import bcrypt from "bcryptjs";
import { AppointmentStatus, InsuranceStatus, PrismaClient, Role, TimeSlotStatus } from "@prisma/client";

const prisma = new PrismaClient();

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

  const receptionistUser = await prisma.user.upsert({
    where: { email: "demo-recepcion@dentpro.co" },
    update: {
      name: "Diana",
      lastName: "Mora",
      role: Role.RECEPCIONISTA,
      passwordHash: await bcrypt.hash("RecepDentPro!1", 12),
    },
    create: {
      email: "demo-recepcion@dentpro.co",
      name: "Diana",
      lastName: "Mora",
      role: Role.RECEPCIONISTA,
      passwordHash: await bcrypt.hash("RecepDentPro!1", 12),
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

  const professionalUser = await prisma.user.upsert({
    where: { email: "demo-profesional@dentpro.co" },
    update: {
      name: "Laura",
      lastName: "Rojas",
      role: Role.PROFESIONAL,
      passwordHash: await bcrypt.hash("DentProDemo!1", 12),
    },
    create: {
      email: "demo-profesional@dentpro.co",
      name: "Laura",
      lastName: "Rojas",
      role: Role.PROFESIONAL,
      passwordHash: await bcrypt.hash("DentProDemo!1", 12),
    },
  });

  const specialty = specialties[0];

  const professionalProfile = await prisma.professionalProfile.upsert({
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

  const patientUser = await prisma.user.upsert({
    where: { email: "demo-paciente@dentpro.co" },
    update: {
      name: "Andrea",
      lastName: "Gomez",
      role: Role.PACIENTE,
      passwordHash: await bcrypt.hash("DentProDemo!1", 12),
    },
    create: {
      email: "demo-paciente@dentpro.co",
      name: "Andrea",
      lastName: "Gomez",
      role: Role.PACIENTE,
      passwordHash: await bcrypt.hash("DentProDemo!1", 12),
    },
  });

  const patientProfile = await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: {
      phone: "+57 310 555 9812",
      documentId: "CC10928312",
      insuranceProvider: "Colsanitas Dental Plan",
      insuranceStatus: InsuranceStatus.ACTIVE,
      address: "Cra. 7 #13-180",
      city: "Chía, Cundinamarca",
      patientCode: "8930211",
      avatarUrl: null,
      active: true,
    },
    create: {
      userId: patientUser.id,
      phone: "+57 310 555 9812",
      documentId: "CC10928312",
      insuranceProvider: "Colsanitas Dental Plan",
      insuranceStatus: InsuranceStatus.ACTIVE,
      address: "Cra. 7 #13-180",
      city: "Chía, Cundinamarca",
      patientCode: "8930211",
      avatarUrl: null,
      active: true,
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const slots = buildSlotTimes(tomorrow, 6, professionalProfile.slotDurationMinutes ?? specialty.defaultSlotDurationMinutes);

  await prisma.timeSlot.createMany({
    data: slots.map((slot) => ({
      professionalId: professionalProfile.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      status: TimeSlotStatus.AVAILABLE,
    })),
    skipDuplicates: true,
  });

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 10);
  pastDate.setHours(9, 0, 0, 0);

  const pastSlots = buildSlotTimes(pastDate, 2, professionalProfile.slotDurationMinutes ?? specialty.defaultSlotDurationMinutes);
  const createdPastSlots = await Promise.all(
    pastSlots.map((slot) =>
      prisma.timeSlot.create({
        data: {
          professionalId: professionalProfile.id,
          startAt: slot.startAt,
          endAt: slot.endAt,
          status: TimeSlotStatus.BOOKED,
        },
      }),
    ),
  );

  await Promise.all(
    createdPastSlots.map((slot, index) =>
      prisma.appointment.create({
        data: {
          patientId: patientProfile.id,
          professionalId: professionalProfile.id,
          timeSlotId: slot.id,
          serviceId: serviceRecords[index % serviceRecords.length].id,
          serviceName: serviceRecords[index % serviceRecords.length].name,
          servicePriceCents: serviceRecords[index % serviceRecords.length].priceCents,
          reason: serviceRecords[index % serviceRecords.length].name,
          status: AppointmentStatus.COMPLETED,
        },
      }),
    ),
  );

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  futureDate.setHours(10, 0, 0, 0);

  const futureSlot = await prisma.timeSlot.create({
    data: {
      professionalId: professionalProfile.id,
      startAt: futureDate,
      endAt: new Date(futureDate.getTime() + (professionalProfile.slotDurationMinutes ?? specialty.defaultSlotDurationMinutes) * 60_000),
      status: TimeSlotStatus.BOOKED,
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patientProfile.id,
      professionalId: professionalProfile.id,
      timeSlotId: futureSlot.id,
      serviceId: serviceRecords[0].id,
      serviceName: serviceRecords[0].name,
      servicePriceCents: serviceRecords[0].priceCents,
      reason: serviceRecords[0].name,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  console.log("Seed completado:");
  console.log(`- Admin: ${adminUser.email}`);
  console.log(`- Recepción demo: ${receptionistUser.email}`);
  console.log(`- Profesional demo: ${professionalUser.email}`);
  console.log(`- Paciente demo: ${patientUser.email}`);
}

main()
  .catch((error) => {
    console.error("Error durante el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
