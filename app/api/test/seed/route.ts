import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AppointmentStatus, Role, TimeSlotStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

export async function POST() {
  if (process.env.NODE_ENV !== "test") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prisma = getPrismaClient();

  const specialty = await prisma.specialty.upsert({
    where: { name: "Odontología General" },
    update: { defaultSlotDurationMinutes: 30, active: true },
    create: { name: "Odontología General", defaultSlotDurationMinutes: 30, active: true },
  });

  const service = await prisma.service.upsert({
    where: { name: "Limpieza Dental" },
    update: {
      description: "Profilaxis y pulido dental.",
      priceCents: 80000,
      durationMinutes: 30,
      active: true,
      specialtyId: specialty.id,
    },
    create: {
      name: "Limpieza Dental",
      description: "Profilaxis y pulido dental.",
      priceCents: 80000,
      durationMinutes: 30,
      active: true,
      specialtyId: specialty.id,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@dentpro.test" },
    update: {
      name: "Admin",
      lastName: "DentPro",
      role: Role.ADMINISTRADOR,
    },
    create: {
      email: "admin@dentpro.test",
      name: "Admin",
      lastName: "DentPro",
      role: Role.ADMINISTRADOR,
      passwordHash: await bcrypt.hash("Test1234!", 10),
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: "recepcion@dentpro.test" },
    update: { name: "Diana", lastName: "Mora", role: Role.RECEPCIONISTA },
    create: {
      email: "recepcion@dentpro.test",
      name: "Diana",
      lastName: "Mora",
      role: Role.RECEPCIONISTA,
      passwordHash: await bcrypt.hash("RecepDentPro!1", 10),
    },
  });

  const professionalUser = await prisma.user.upsert({
    where: { email: "pro1@dentpro.test" },
    update: { name: "Laura", lastName: "Rojas", role: Role.PROFESIONAL },
    create: {
      email: "pro1@dentpro.test",
      name: "Laura",
      lastName: "Rojas",
      role: Role.PROFESIONAL,
      passwordHash: await bcrypt.hash("DentProPro!1", 10),
    },
  });

  const professional = await prisma.professionalProfile.upsert({
    where: { userId: professionalUser.id },
    update: { specialtyId: specialty.id, slotDurationMinutes: 30, active: true },
    create: { userId: professionalUser.id, specialtyId: specialty.id, slotDurationMinutes: 30, active: true },
  });

  const patientUser = await prisma.user.upsert({
    where: { email: "paciente1@dentpro.test" },
    update: { name: "Julia", lastName: "Vargas", role: Role.PACIENTE },
    create: {
      email: "paciente1@dentpro.test",
      name: "Julia",
      lastName: "Vargas",
      role: Role.PACIENTE,
      passwordHash: await bcrypt.hash("DentProPac!1", 10),
    },
  });

  const patient = await prisma.patientProfile.upsert({
    where: { userId: patientUser.id },
    update: { phone: "3005550001", documentId: "CC10001", active: true },
    create: { userId: patientUser.id, phone: "3005550001", documentId: "CC10001", active: true },
  });

  const now = new Date();
  now.setHours(9, 0, 0, 0);
  const timeSlot = await prisma.timeSlot.create({
    data: {
      professionalId: professional.id,
      startAt: now,
      endAt: new Date(now.getTime() + 30 * 60_000),
      status: TimeSlotStatus.BOOKED,
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      professionalId: professional.id,
      timeSlotId: timeSlot.id,
      serviceId: service.id,
      serviceName: service.name,
      servicePriceCents: service.priceCents,
      reason: service.name,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  return NextResponse.json({ ok: true, adminId: admin.id, receptionistId: receptionist.id });
}
