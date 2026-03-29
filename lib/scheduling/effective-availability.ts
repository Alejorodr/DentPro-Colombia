import { AppointmentStatus, ProfessionalScheduleStatus, TimeSlotStatus, UnavailabilityStatus } from "@prisma/client";

import { getAppointmentBufferMinutes, hasBufferConflict } from "@/lib/appointments/scheduling";
import { addDaysZoned, formatDateInput, fromZonedDateParts, getAnalyticsTimeZone, getZonedDateParts } from "@/lib/dates/tz";
import { getPrismaClient } from "@/lib/prisma";

export type UnavailabilityReason =
  | "SERVICE_NOT_ASSIGNED"
  | "OUTSIDE_WORKING_HOURS"
  | "PROFESSIONAL_UNAVAILABLE"
  | "CLINIC_HOLIDAY"
  | "SLOT_NOT_AVAILABLE"
  | "OVERLAPS_APPOINTMENT"
  | "BUFFER_CONFLICT";

export interface EffectiveAvailabilitySlot {
  id: string;
  professionalId: string;
  startAt: Date;
  endAt: Date;
  professional: {
    id: string;
    user: { name: string; lastName: string };
    specialty: { name: string } | null;
  };
}

type TimeInterval = { startAt: Date; endAt: Date };

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

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

export function evaluateEffectiveSlot(params: {
  slot: { id: string; professionalId: string; startAt: Date; endAt: Date; status: TimeSlotStatus };
  holiday: boolean;
  serviceId?: string;
  allowedProfessionalIds: Set<string>;
  schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  blocks: Array<{ startsAt: Date; endsAt: Date }>;
}): UnavailabilityReason[] {
  const reasons: UnavailabilityReason[] = [];
  const slotMinutes = getZonedDateParts(params.slot.startAt, getAnalyticsTimeZone());
  const dayOfWeek = new Date(Date.UTC(slotMinutes.year, slotMinutes.month - 1, slotMinutes.day)).getUTCDay();
  const startMinutes = slotMinutes.hour * 60 + slotMinutes.minute;
  const slotEnd = getZonedDateParts(params.slot.endAt, getAnalyticsTimeZone());
  const endMinutes = slotEnd.hour * 60 + slotEnd.minute;

  if (params.slot.status !== TimeSlotStatus.AVAILABLE) reasons.push("SLOT_NOT_AVAILABLE");
  if (params.serviceId && !params.allowedProfessionalIds.has(params.slot.professionalId)) reasons.push("SERVICE_NOT_ASSIGNED");
  if (params.holiday) reasons.push("CLINIC_HOLIDAY");

  const inSchedule = params.schedules.some((schedule) => {
    if (schedule.dayOfWeek !== dayOfWeek) return false;
    return startMinutes >= toMinutes(schedule.startTime) && endMinutes <= toMinutes(schedule.endTime);
  });
  if (!inSchedule) reasons.push("OUTSIDE_WORKING_HOURS");

  if (params.blocks.some((block) => block.startsAt < params.slot.endAt && block.endsAt > params.slot.startAt)) {
    reasons.push("PROFESSIONAL_UNAVAILABLE");
  }

  return reasons;
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
      if (schedule.dayOfWeek !== dayOfWeek) {
        continue;
      }

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

      if (endAt <= dateStart || startAt >= dateEnd || endAt <= startAt) {
        continue;
      }

      intervals.push({
        startAt: startAt < dateStart ? dateStart : startAt,
        endAt: endAt > dateEnd ? dateEnd : endAt,
      });
    }
  }

  return intervals.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export async function getEffectiveAvailability(params: {
  dateStart: Date;
  dateEnd: Date;
  serviceId?: string;
  professionalId?: string;
  includeReasons?: boolean;
}) {
  const prisma = getPrismaClient();
  const { dateStart, dateEnd, serviceId, professionalId, includeReasons = false } = params;
  const timeZone = getAnalyticsTimeZone();

  const service = serviceId
    ? await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true, active: true, durationMinutes: true } })
    : null;

  if (serviceId && (!service || !service.active)) {
    return {
      slots: [],
      reasons: includeReasons ? new Map<string, UnavailabilityReason[]>() : null,
      effectiveRangesByProfessional: new Map<string, TimeInterval[]>(),
    };
  }

  const assignments = await prisma.professionalService.findMany({
    where: {
      ...(serviceId ? { serviceId } : {}),
      ...(professionalId ? { professionalId } : {}),
      active: true,
      onlineBookable: true,
      professional: { active: true },
    },
    select: {
      professionalId: true,
      appointmentDurationMinutes: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
    },
  });

  const allowedProfessionalIds = new Set(assignments.map((item) => item.professionalId));
  if (serviceId && allowedProfessionalIds.size === 0) {
    return {
      slots: [],
      reasons: includeReasons ? new Map<string, UnavailabilityReason[]>() : null,
      effectiveRangesByProfessional: new Map<string, TimeInterval[]>(),
    };
  }

  const whereProfessionals = professionalId
    ? [professionalId]
    : allowedProfessionalIds.size > 0
      ? [...allowedProfessionalIds]
      : undefined;

  const [holidayRows, schedules, unavailability, appointments, candidateSlots] = await Promise.all([
    prisma.clinicHoliday.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(dateStart.getUTCFullYear(), dateStart.getUTCMonth(), dateStart.getUTCDate())),
          lt: new Date(Date.UTC(dateEnd.getUTCFullYear(), dateEnd.getUTCMonth(), dateEnd.getUTCDate() + 1)),
        },
      },
      select: { date: true, name: true },
    }),
    prisma.professionalWorkingSchedule.findMany({
      where: {
        ...(whereProfessionals ? { professionalId: { in: whereProfessionals } } : {}),
        active: true,
        status: ProfessionalScheduleStatus.CONFIRMED,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: dateEnd } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateStart } }] }],
      },
      select: { professionalId: true, dayOfWeek: true, startTime: true, endTime: true },
    }),
    prisma.professionalUnavailability.findMany({
      where: {
        ...(whereProfessionals ? { professionalId: { in: whereProfessionals } } : {}),
        status: { in: [UnavailabilityStatus.APPROVED, UnavailabilityStatus.PENDING] },
        startsAt: { lt: dateEnd },
        endsAt: { gt: dateStart },
      },
      select: { professionalId: true, startsAt: true, endsAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        ...(whereProfessionals ? { professionalId: { in: whereProfessionals } } : {}),
        status: { not: AppointmentStatus.CANCELLED },
        timeSlot: {
          startAt: { lt: dateEnd },
          endAt: { gt: dateStart },
        },
      },
      select: { professionalId: true, timeSlot: { select: { startAt: true, endAt: true } } },
    }),
    prisma.timeSlot.findMany({
      where: {
        ...(whereProfessionals ? { professionalId: { in: whereProfessionals } } : {}),
        startAt: { gte: dateStart, lt: dateEnd },
      },
      include: { professional: { include: { user: true, specialty: true } } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  const holidayDates = new Set(holidayRows.map((holiday) => formatDateInput(holiday.date, timeZone)));
  const reasons = includeReasons ? new Map<string, UnavailabilityReason[]>() : null;

  const scheduleByProfessional = new Map<string, Array<{ dayOfWeek: number; startTime: string; endTime: string }>>();
  for (const schedule of schedules) {
    const current = scheduleByProfessional.get(schedule.professionalId) ?? [];
    current.push(schedule);
    scheduleByProfessional.set(schedule.professionalId, current);
  }

  const blockersByProfessional = new Map<string, TimeInterval[]>();
  for (const item of unavailability) {
    const current = blockersByProfessional.get(item.professionalId) ?? [];
    current.push({ startAt: item.startsAt, endAt: item.endsAt });
    blockersByProfessional.set(item.professionalId, current);
  }
  for (const item of appointments) {
    const current = blockersByProfessional.get(item.professionalId) ?? [];
    current.push({ startAt: item.timeSlot.startAt, endAt: item.timeSlot.endAt });
    blockersByProfessional.set(item.professionalId, current);
  }

  const effectiveRangesByProfessional = new Map<string, TimeInterval[]>();
  const professionals = [...new Set(candidateSlots.map((slot) => slot.professionalId))];
  for (const profId of professionals) {
    const base = buildWorkingIntervals({
      schedules: scheduleByProfessional.get(profId) ?? [],
      dateStart,
      dateEnd,
      timeZone,
    });

    const dayHolidayBlocks: TimeInterval[] = [];
    for (let cursor = dateStart; cursor < dateEnd; cursor = addDaysZoned(cursor, 1, timeZone)) {
      const dayLabel = formatDateInput(cursor, timeZone);
      if (!holidayDates.has(dayLabel)) {
        continue;
      }
      const parts = getZonedDateParts(cursor, timeZone);
      const dayStart = fromZonedDateParts({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
      const dayEnd = addDaysZoned(dayStart, 1, timeZone);
      dayHolidayBlocks.push({ startAt: dayStart, endAt: dayEnd });
    }

    const effective = subtractIntervals(base, [...(blockersByProfessional.get(profId) ?? []), ...dayHolidayBlocks]);
    effectiveRangesByProfessional.set(profId, effective);
  }

  const bufferMinutes = getAppointmentBufferMinutes();
  const bookedSlots = bufferMinutes > 0
    ? await prisma.timeSlot.findMany({
        where: {
          ...(whereProfessionals ? { professionalId: { in: whereProfessionals } } : {}),
          status: TimeSlotStatus.BOOKED,
          startAt: { lt: new Date(dateEnd.getTime() + bufferMinutes * 60_000) },
          endAt: { gt: new Date(dateStart.getTime() - bufferMinutes * 60_000) },
        },
        select: { professionalId: true, startAt: true, endAt: true },
      })
    : [];
  const bookedByProfessional = new Map<string, Array<{ startAt: Date; endAt: Date }>>();
  for (const slot of bookedSlots) {
    const current = bookedByProfessional.get(slot.professionalId) ?? [];
    current.push(slot);
    bookedByProfessional.set(slot.professionalId, current);
  }

  const availableSlots: EffectiveAvailabilitySlot[] = [];
  for (const slot of candidateSlots) {
    const slotReasons: UnavailabilityReason[] = [];

    if (slot.status !== TimeSlotStatus.AVAILABLE) {
      slotReasons.push("SLOT_NOT_AVAILABLE");
    }

    if (serviceId && !allowedProfessionalIds.has(slot.professionalId)) {
      slotReasons.push("SERVICE_NOT_ASSIGNED");
    }

    const slotDay = formatDateInput(slot.startAt, timeZone);
    if (holidayDates.has(slotDay)) {
      slotReasons.push("CLINIC_HOLIDAY");
    }

    const effectiveRanges = effectiveRangesByProfessional.get(slot.professionalId) ?? [];
    const withinRange = effectiveRanges.some((range) => slot.startAt >= range.startAt && slot.endAt <= range.endAt);
    if (!withinRange) {
      slotReasons.push("OUTSIDE_WORKING_HOURS");
    }

    const occupiedRanges = blockersByProfessional.get(slot.professionalId) ?? [];
    if (occupiedRanges.some((range) => rangesOverlap(range, slot))) {
      slotReasons.push("OVERLAPS_APPOINTMENT");
    }

    if (bufferMinutes > 0) {
      const conflicts = hasBufferConflict(
        { startAt: slot.startAt, endAt: slot.endAt },
        bookedByProfessional.get(slot.professionalId) ?? [],
        bufferMinutes,
      );
      if (conflicts) {
        slotReasons.push("BUFFER_CONFLICT");
      }
    }

    if (serviceId) {
      const assignment = assignments.find((item) => item.professionalId === slot.professionalId);
      const duration = assignment?.appointmentDurationMinutes ?? service?.durationMinutes ?? null;
      const requiredMinutes = duration && duration > 0 ? duration : toMinutes("00:30");
      const currentMinutes = (slot.endAt.getTime() - slot.startAt.getTime()) / 60_000;
      if (currentMinutes < requiredMinutes) {
        slotReasons.push("OUTSIDE_WORKING_HOURS");
      }
    }

    if (slotReasons.length > 0) {
      if (reasons) {
        reasons.set(slot.id, slotReasons);
      }
      continue;
    }

    availableSlots.push({
      id: slot.id,
      professionalId: slot.professionalId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      professional: {
        id: slot.professional.id,
        user: { name: slot.professional.user.name, lastName: slot.professional.user.lastName },
        specialty: slot.professional.specialty,
      },
    });
  }

  return { slots: availableSlots, reasons, effectiveRangesByProfessional };
}

export async function assertSlotBookable(input: { slotId: string; serviceId: string; professionalId?: string }) {
  const prisma = getPrismaClient();
  const slot = await prisma.timeSlot.findUnique({ where: { id: input.slotId } });
  if (!slot) {
    return { ok: false as const, status: 404, message: "Slot no encontrado." };
  }

  if (input.professionalId && slot.professionalId !== input.professionalId) {
    return { ok: false as const, status: 409, message: "El profesional no coincide con el slot." };
  }

  const effective = await getEffectiveAvailability({
    dateStart: slot.startAt,
    dateEnd: slot.endAt,
    serviceId: input.serviceId,
    professionalId: slot.professionalId,
    includeReasons: true,
  });

  if (!effective.slots.some((item) => item.id === slot.id)) {
    const reasons = effective.reasons?.get(slot.id) ?? ["SLOT_NOT_AVAILABLE"];
    return {
      ok: false as const,
      status: 409,
      message: "El horario seleccionado no está disponible operativamente.",
      reasons,
    };
  }

  return { ok: true as const, slot };
}
