import "server-only";

import { cache } from "react";
import { AppointmentStatus, Role } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import { roleLabels } from "@/lib/auth/roles";

type StaffMember = {
  id: string;
  name: string;
  role: Role;
  subtitle: string;
};

type TrendSeries = {
  series: number[];
  labels: string[];
  metricLabel: string;
  hasData: boolean;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatWeekLabel(date: Date) {
  return date.toLocaleDateString("es-CO", { month: "short", day: "2-digit" });
}

export const getAdminDashboardSummary = cache(async () => {
  const prisma = getPrismaClient();
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);

  const [appointmentsToday, pendingAppointments, staffCount] = await Promise.all([
    prisma.appointment.count({
      where: {
        timeSlot: {
          startAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
      },
    }),
    prisma.appointment.count({ where: { status: AppointmentStatus.PENDING } }),
    prisma.user.count({
      where: {
        OR: [
          { role: { in: [Role.ADMINISTRADOR, Role.RECEPCIONISTA] } },
          { role: Role.PROFESIONAL, professional: { active: true } },
        ],
      },
    }),
  ]);

  return {
    appointmentsToday,
    pendingAppointments,
    staffCount,
    revenueMTD: 0,
    revenueNote: "Módulo de cobros no configurado",
  };
});

export const getTodayAppointments = cache(async () => {
  const prisma = getPrismaClient();
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);

  return prisma.appointment.findMany({
    where: {
      timeSlot: {
        startAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    },
    include: {
      timeSlot: true,
      patient: { include: { user: true } },
      professional: { include: { user: true } },
    },
    orderBy: { timeSlot: { startAt: "asc" } },
  });
});

export const getStaffList = cache(async (): Promise<StaffMember[]> => {
  const prisma = getPrismaClient();
  const staff = await prisma.user.findMany({
    where: {
      OR: [
        { role: { in: [Role.ADMINISTRADOR, Role.RECEPCIONISTA] } },
        { role: Role.PROFESIONAL, professional: { active: true } },
      ],
    },
    include: {
      professional: { include: { specialty: true } },
    },
    orderBy: { name: "asc" },
  });

  return staff.map((user) => ({
    id: user.id,
    name: `${user.name} ${user.lastName}`.trim(),
    role: user.role,
    subtitle: user.professional?.specialty?.name ?? roleLabels[user.role],
  }));
});

export const getTrendSeries = cache(async (): Promise<TrendSeries> => {
  const prisma = getPrismaClient();
  const weekStart = startOfWeek(new Date());
  const weekStarts = Array.from({ length: 6 }, (_, index) => addDays(weekStart, (index - 5) * 7));
  const rangeStart = weekStarts[0];
  const rangeEnd = addDays(weekStart, 7);

  const appointments = await prisma.appointment.findMany({
    where: {
      timeSlot: {
        startAt: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
    },
    select: { timeSlot: { select: { startAt: true } } },
  });

  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    const slotStart = appointment.timeSlot.startAt;
    const key = startOfWeek(slotStart).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const series = weekStarts.map((date) => counts.get(date.toISOString()) ?? 0);
  const labels = weekStarts.map((date) => formatWeekLabel(date));

  return {
    series,
    labels,
    metricLabel: "Citas por semana",
    hasData: series.some((value) => value > 0),
  };
});
