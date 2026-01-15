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
  rangeStart: Date,
  rangeEnd: Date,
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];

  const exceptionMap = new Map(
    exceptions.map((exception) => [exception.date.toDateString(), exception]),
  );

  for (const rule of rules) {
    const ruleSet = RRule.fromString(rule.rrule);
    const dates = ruleSet.between(rangeStart, rangeEnd, true);

    for (const date of dates) {
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

      slots.push({ startAt, endAt, ruleId: rule.id });
    }
  }

  return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
