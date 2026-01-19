import { RRule } from "rrule";

interface AvailabilityRuleInput {
  id: string;
  rrule: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

interface AvailabilityExceptionInput {
  date: Date;
  isAvailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

interface AvailabilityBlockInput {
  startAt: Date;
  endAt: Date;
}

interface ClinicHolidayInput {
  date: Date;
}

export interface AvailabilitySlot {
  startAt: Date;
  endAt: Date;
  ruleId?: string;
}

function applyTime(baseDate: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

export function expandAvailability(
  rules: AvailabilityRuleInput[],
  exceptions: AvailabilityExceptionInput[],
  blocks: AvailabilityBlockInput[],
  holidays: ClinicHolidayInput[],
  rangeStart: Date,
  rangeEnd: Date,
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];

  const exceptionMap = new Map(
    exceptions.map((exception) => [exception.date.toDateString(), exception]),
  );
  const holidaySet = new Set(holidays.map((holiday) => holiday.date.toDateString()));

  for (const rule of rules) {
    const ruleSet = RRule.fromString(rule.rrule);
    const dates = ruleSet.between(rangeStart, rangeEnd, true);

    for (const date of dates) {
      if (holidaySet.has(date.toDateString())) {
        continue;
      }
      const exception = exceptionMap.get(date.toDateString());
      if (exception && !exception.isAvailable) {
        continue;
      }

      const startTime = exception?.startTime ?? rule.startTime;
      const endTime = exception?.endTime ?? rule.endTime;

      if (!startTime || !endTime) {
        continue;
      }

      const startAt = applyTime(date, startTime);
      const endAt = applyTime(date, endTime);

      if (startAt < rangeStart || endAt > rangeEnd) {
        continue;
      }

      const blocked = blocks.some((block) => block.startAt < endAt && block.endAt > startAt);
      if (blocked) {
        continue;
      }

      slots.push({ startAt, endAt, ruleId: rule.id });
    }
  }

  return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
