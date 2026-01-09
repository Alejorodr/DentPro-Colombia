import bcrypt from "bcryptjs";
import { PrismaClient, Role, TimeSlotStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SPECIALTIES = [
  { name: "Odontología General", defaultSlotDurationMinutes: 30 },
  { name: "Ortodoncia", defaultSlotDurationMinutes: 45 },
  { name: "Endodoncia", defaultSlotDurationMinutes: 60 },
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

  console.log("Seed completado:");
  console.log(`- Admin: ${adminUser.email}`);
  console.log(`- Profesional demo: ${professionalUser.email}`);
}

main()
  .catch((error) => {
    console.error("Error durante el seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
