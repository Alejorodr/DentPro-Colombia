import { TimeSlotStatus, UnavailabilityStatus } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

export type UnavailabilityReason =
  | "SERVICE_NOT_ASSIGNED"
  | "OUTSIDE_WORKING_HOURS"
  | "PROFESSIONAL_UNAVAILABLE"
  | "CLINIC_HOLIDAY"
  | "SLOT_NOT_AVAILABLE";

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

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function getDayOfWeekBogota(date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Bogota" });
  const short = formatter.format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? date.getUTCDay();
}

function isWithinSchedule(
  slot: { startAt: Date; endAt: Date },
  schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
): boolean {
  if (schedules.length === 0) {
    return true;
  }
  const day = getDayOfWeekBogota(slot.startAt);
  const toBogotaMinutes = (value: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(value);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  };
  const startMinutes = toBogotaMinutes(slot.startAt);
  const endMinutes = toBogotaMinutes(slot.endAt);

  return schedules.some((schedule) => {
    if (schedule.dayOfWeek !== day) {
      return false;
    }
    const scheduleStart = toMinutes(schedule.startTime);
    const scheduleEnd = toMinutes(schedule.endTime);
    return startMinutes >= scheduleStart && endMinutes <= scheduleEnd;
  });
}


export function evaluateEffectiveSlot(params: {
  slot: { id: string; professionalId: string; startAt: Date; endAt: Date; status: TimeSlotStatus };
  holiday: boolean;
  serviceId?: string;
  allowedProfessionalIds: Set<string>;
  schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  blocks: Array<{ startsAt: Date; endsAt: Date }>;
}): UnavailabilityReason[] {
  const { slot, holiday, serviceId, allowedProfessionalIds, schedules, blocks } = params;
  const slotReasons: UnavailabilityReason[] = [];

  if (slot.status !== TimeSlotStatus.AVAILABLE) {
    slotReasons.push("SLOT_NOT_AVAILABLE");
  }

  if (serviceId && !allowedProfessionalIds.has(slot.professionalId)) {
    slotReasons.push("SERVICE_NOT_ASSIGNED");
  }

  if (holiday) {
    slotReasons.push("CLINIC_HOLIDAY");
  }

  if (!isWithinSchedule(slot, schedules)) {
    slotReasons.push("OUTSIDE_WORKING_HOURS");
  }

  if (blocks.some((block) => block.startsAt < slot.endAt && block.endsAt > slot.startAt)) {
    slotReasons.push("PROFESSIONAL_UNAVAILABLE");
  }

  return slotReasons;
}

export async function getEffectiveAvailability(params: {
  dateStart: Date;
  dateEnd: Date;
  serviceId?: string;
  includeReasons?: boolean;
}) {
  const prisma = getPrismaClient();
  const { dateStart, dateEnd, serviceId, includeReasons = false } = params;

  const [holiday, slots, serviceAssignments, schedules, unavailability] = await Promise.all([
    prisma.clinicHoliday.findFirst({
      where: {
        date: {
          gte: new Date(Date.UTC(dateStart.getUTCFullYear(), dateStart.getUTCMonth(), dateStart.getUTCDate())),
          lt: new Date(Date.UTC(dateEnd.getUTCFullYear(), dateEnd.getUTCMonth(), dateEnd.getUTCDate())),
        },
      },
    }),
    prisma.timeSlot.findMany({
      where: {
        startAt: { gte: dateStart, lt: dateEnd },
      },
      include: {
        professional: { include: { user: true, specialty: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    serviceId
      ? prisma.professionalService.findMany({
          where: {
            serviceId,
            active: true,
            onlineBookable: true,
            professional: { active: true },
          },
          select: { professionalId: true },
        })
      : Promise.resolve([]),
    prisma.professionalWorkingSchedule.findMany({
      where: {
        active: true,
        status: "CONFIRMED",
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: dateEnd } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateStart } }] }],
      },
      select: { professionalId: true, dayOfWeek: true, startTime: true, endTime: true },
    }),
    prisma.professionalUnavailability.findMany({
      where: {
        status: { in: [UnavailabilityStatus.APPROVED, UnavailabilityStatus.PENDING] },
        startsAt: { lt: dateEnd },
        endsAt: { gt: dateStart },
      },
      select: { professionalId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const allowedProfessionalIds = new Set(serviceAssignments.map((item) => item.professionalId));
  const schedulesByProfessional = schedules.reduce((acc, schedule) => {
    const entries = acc.get(schedule.professionalId) ?? [];
    entries.push(schedule);
    acc.set(schedule.professionalId, entries);
    return acc;
  }, new Map<string, Array<{ dayOfWeek: number; startTime: string; endTime: string }>>());

  const unavailableByProfessional = unavailability.reduce((acc, block) => {
    const entries = acc.get(block.professionalId) ?? [];
    entries.push(block);
    acc.set(block.professionalId, entries);
    return acc;
  }, new Map<string, Array<{ startsAt: Date; endsAt: Date }>>());

  const reasons = includeReasons ? new Map<string, UnavailabilityReason[]>() : null;
  const availableSlots: EffectiveAvailabilitySlot[] = [];

  for (const slot of slots) {
    const schedule = schedulesByProfessional.get(slot.professionalId) ?? [];
    const blocks = unavailableByProfessional.get(slot.professionalId) ?? [];
    const slotReasons = evaluateEffectiveSlot({
      slot,
      holiday: Boolean(holiday),
      serviceId,
      allowedProfessionalIds,
      schedules: schedule,
      blocks,
    });

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
        user: {
          name: slot.professional.user.name,
          lastName: slot.professional.user.lastName,
        },
        specialty: slot.professional.specialty,
      },
    });
  }

  return { slots: availableSlots, reasons };
}
