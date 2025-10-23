#!/usr/bin/env node
const { randomUUID } = require("crypto");
const bcrypt = require("bcrypt");
const { PrismaClient, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

const defaultUsers = [
  { name: "Laura Gómez", email: "laura@dentpro.co", role: UserRole.patient },
  { name: "Dr. Santiago Herrera", email: "santiago@dentpro.co", role: UserRole.professional },
  { name: "Coordinación Chía", email: "recepcion@dentpro.co", role: UserRole.reception },
  { name: "Ana María Pérez", email: "admin@dentpro.co", role: UserRole.admin },
];

async function main() {
  const defaultPassword = process.env.SEED_PASSWORD;

  if (!defaultPassword) {
    throw new Error(
      "SEED_PASSWORD no está definido. Configura una contraseña segura en las variables de entorno antes de ejecutar el seed."
    );
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  for (const user of defaultUsers) {
    await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      update: {
        name: user.name,
        passwordHash,
        primaryRole: user.role,
      },
      create: {
        id: randomUUID(),
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash,
        primaryRole: user.role,
      },
    });
  }

  console.log(
    `Seed completado. Usuarios sincronizados (${defaultUsers.length}) con credenciales protegidas.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error("Error al ejecutar el seed:", error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
