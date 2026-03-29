import { AppointmentStatus, ProfessionalScheduleStatus, TimeSlotStatus, UnavailabilityStatus, type PrismaClient } from "@prisma/client";

import { addDaysZoned, formatDateInput, fromZonedDateParts, getAnalyticsTimeZone, getZonedDateParts } from "@/lib/dates/tz";
import { getPrismaClient } from "@/lib/prisma";

type TimeInterval = { startAt: Date; endAt: Date };

function rangesOverlap(a: TimeInterval, b: TimeInterval) {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

function subtractIntervals(base: TimeInterval[], blockers: TimeInterval[]): TimeInterval[] {
  let result = [...base];
  for (const blocker of blockers) {
    const next: TimeInterval[] = [];
    for (const candidate of result) {
      if (!rangesOverlap(candidate, blocker)) {
        next.push(candidate);
        continue;
      }

      if (blocker.startAt > candidate.startAt) {
        next.push({ startAt: candidate.startAt, endAt: blocker.startAt });
      }
      if (blocker.endAt < candidate.endAt) {
        next.push({ startAt: blocker.endAt, endAt: candidate.endAt });
      }
    }
    result = next;
  }

  return result.filter((range) => range.endAt > range.startAt);
}

function buildWorkingIntervals(params: {
  schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  dateStart: Date;
  dateEnd: Date;
  timeZone: string;
}): TimeInterval[] {
  const { schedules, dateStart, dateEnd, timeZone } = params;
  const intervals: TimeInterval[] = [];

  for (let cursor = dateStart; cursor < dateEnd; cursor = addDaysZoned(cursor, 1, timeZone)) {
    const parts = getZonedDateParts(cursor, timeZone);
    const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();

    for (const schedule of schedules) {
      if (schedule.dayOfWeek !== dayOfWeek) continue;
      const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
      const [endHour, endMinute] = schedule.endTime.split(":").map(Number);

      const startAt = fromZonedDateParts(
        { year: parts.year, month: parts.month, day: parts.day, hour: startHour ?? 0, minute: startMinute ?? 0, second: 0 },
        timeZone,
      );
      const endAt = fromZonedDateParts(
        { year: parts.year, month: parts.month, day: parts.day, hour: endHour ?? 0, minute: endMinute ?? 0, second: 0 },
        timeZone,
      );

      if (endAt <= dateStart || startAt >= dateEnd || endAt <= startAt) continue;

      intervals.push({
        startAt: startAt < dateStart ? dateStart : startAt,
        endAt: endAt > dateEnd ? dateEnd : endAt,
      });
    }
  }

  return intervals.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export function buildSlotsFromIntervals(intervals: TimeInterval[], durationMinutes: number): TimeInterval[] {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return [];
  }

  const slots: TimeInterval[] = [];
  const stepMs = durationMinutes * 60_000;
  for (const interval of intervals) {
    let cursor = interval.startAt.getTime();
    while (cursor + stepMs <= interval.endAt.getTime()) {
      slots.push({ startAt: new Date(cursor), endAt: new Date(cursor + stepMs) });
      cursor += stepMs;
    }
  }

  return slots;
}

export async function refreshFutureInventoryForProfessional(params: {
  professionalId: string;
  rangeStart: Date;
  rangeEnd: Date;
  now?: Date;
  prisma?: PrismaClient;
}) {
  const prisma = params.prisma ?? getPrismaClient();
  const timeZone = getAnalyticsTimeZone();
  const now = params.now ?? new Date();
  const rangeStart = params.rangeStart > now ? params.rangeStart : now;
  const rangeEnd = params.rangeEnd;

  if (rangeEnd <= rangeStart) {
    return { removed: 0, created: 0, skipped: true as const };
  }

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: params.professionalId },
    include: { specialty: true },
  });

  if (!professional || !professional.active) {
    return { removed: 0, created: 0, skipped: true as const };
  }

  const [schedules, unavailability, appointments, holidays] = await Promise.all([
    prisma.professionalWorkingSchedule.findMany({
      where: {
        professionalId: professional.id,
        active: true,
        status: ProfessionalScheduleStatus.CONFIRMED,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: rangeEnd } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: rangeStart } }] }],
      },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    }),
    prisma.professionalUnavailability.findMany({
      where: {
        professionalId: professional.id,
        status: { in: [UnavailabilityStatus.APPROVED, UnavailabilityStatus.PENDING] },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        professionalId: professional.id,
        status: { not: AppointmentStatus.CANCELLED },
        timeSlot: { startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } },
      },
      select: { timeSlot: { select: { startAt: true, endAt: true } } },
    }),
    prisma.clinicHoliday.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate())),
          lt: new Date(Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate() + 1)),
        },
      },
      select: { date: true },
    }),
  ]);

  const base = buildWorkingIntervals({ schedules, dateStart: rangeStart, dateEnd: rangeEnd, timeZone });
  const blockers: TimeInterval[] = [
    ...unavailability.map((item) => ({ startAt: item.startsAt, endAt: item.endsAt })),
    ...appointments.map((item) => ({ startAt: item.timeSlot.startAt, endAt: item.timeSlot.endAt })),
  ];

  const holidayDates = new Set(holidays.map((holiday) => formatDateInput(holiday.date, timeZone)));
  for (let cursor = rangeStart; cursor < rangeEnd; cursor = addDaysZoned(cursor, 1, timeZone)) {
    const dayLabel = formatDateInput(cursor, timeZone);
    if (!holidayDates.has(dayLabel)) continue;

    const parts = getZonedDateParts(cursor, timeZone);
    const dayStart = fromZonedDateParts({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
    blockers.push({ startAt: dayStart, endAt: addDaysZoned(dayStart, 1, timeZone) });
  }

  const effective = subtractIntervals(base, blockers);
  const duration = professional.slotDurationMinutes ?? professional.specialty.defaultSlotDurationMinutes;
  const slots = buildSlotsFromIntervals(effective, duration);

  return prisma.$transaction(async (tx) => {
    const removed = await tx.timeSlot.deleteMany({
      where: {
        professionalId: professional.id,
        status: TimeSlotStatus.AVAILABLE,
        appointment: null,
        startAt: { gte: rangeStart, lt: rangeEnd },
      },
    });

    const created = await tx.timeSlot.createMany({
      data: slots.map((slot) => ({
        professionalId: professional.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: TimeSlotStatus.AVAILABLE,
      })),
      skipDuplicates: true,
    });

    return { removed: removed.count, created: created.count, skipped: false as const };
  });
}

export async function refreshFutureInventoryForAllProfessionals(params: {
  rangeStart: Date;
  rangeEnd: Date;
  now?: Date;
  prisma?: PrismaClient;
}) {
  const prisma = params.prisma ?? getPrismaClient();
  const professionals = await prisma.professionalProfile.findMany({ where: { active: true }, select: { id: true } });
  let removed = 0;
  let created = 0;
  for (const professional of professionals) {
    const result = await refreshFutureInventoryForProfessional({
      professionalId: professional.id,
      rangeStart: params.rangeStart,
      rangeEnd: params.rangeEnd,
      now: params.now,
      prisma,
    });
    removed += result.removed;
    created += result.created;
  }

  return { professionals: professionals.length, removed, created };
}
