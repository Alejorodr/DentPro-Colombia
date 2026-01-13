import {
  addDaysZoned,
  addMonthsZoned,
  formatDateInput,
  formatInTimeZone,
  fromZonedDateParts,
  getAnalyticsTimeZone,
  startOfZonedDay,
  startOfZonedMonth,
  startOfZonedWeek,
  startOfZonedYear,
} from "@/lib/dates/tz";

export type AnalyticsBucket = "day" | "week" | "month";
export type AnalyticsRangeKey = "today" | "last7" | "last30" | "mtd" | "ytd" | "custom";

export type AnalyticsRange = {
  rangeKey: AnalyticsRangeKey;
  from: Date;
  to: Date;
  bucket: AnalyticsBucket;
  label: string;
  fromInput: string;
  toInput: string;
  timeZone: string;
};

function getParam(value?: string | string[]) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parseDateInput(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function calculateDaysBetween(from: Date, to: Date, timeZone: string) {
  let total = 0;
  let cursor = startOfZonedDay(from, timeZone);
  while (cursor < to) {
    total += 1;
    cursor = addDaysZoned(cursor, 1, timeZone);
  }
  return total;
}

function resolveBucket(rangeKey: AnalyticsRangeKey, totalDays: number): AnalyticsBucket {
  if (rangeKey === "today" || rangeKey === "last7") {
    return "day";
  }
  if (rangeKey === "last30" || rangeKey === "mtd") {
    return totalDays > 31 ? "week" : "day";
  }
  if (rangeKey === "ytd") {
    return totalDays > 120 ? "month" : "week";
  }
  if (totalDays <= 31) {
    return "day";
  }
  if (totalDays <= 120) {
    return "week";
  }
  return "month";
}

export function parseRange(
  searchParams: {
    range?: string | string[];
    from?: string | string[];
    to?: string | string[];
  },
  options?: { timeZone?: string },
): AnalyticsRange {
  const timeZone = options?.timeZone ?? getAnalyticsTimeZone();
  const rangeParam = getParam(searchParams.range) ?? "last7";
  const normalizedRange =
    rangeParam === "7d" ? "last7" : rangeParam === "30d" ? "last30" : rangeParam;
  const rangeKey: AnalyticsRangeKey =
    normalizedRange === "today" ||
    normalizedRange === "last7" ||
    normalizedRange === "last30" ||
    normalizedRange === "mtd" ||
    normalizedRange === "ytd"
      ? normalizedRange
      : "custom";

  const todayStart = startOfZonedDay(new Date(), timeZone);

  let fromDate = todayStart;
  let toDate = todayStart;

  switch (rangeKey) {
    case "today":
      fromDate = todayStart;
      toDate = todayStart;
      break;
    case "last7":
      fromDate = addDaysZoned(todayStart, -6, timeZone);
      toDate = todayStart;
      break;
    case "last30":
      fromDate = addDaysZoned(todayStart, -29, timeZone);
      toDate = todayStart;
      break;
    case "mtd":
      fromDate = startOfZonedMonth(todayStart, timeZone);
      toDate = todayStart;
      break;
    case "ytd":
      fromDate = startOfZonedYear(todayStart, timeZone);
      toDate = todayStart;
      break;
    case "custom": {
      const parsedFrom = parseDateInput(getParam(searchParams.from));
      const parsedTo = parseDateInput(getParam(searchParams.to));
      if (parsedFrom) {
        fromDate = fromZonedDateParts(
          { ...parsedFrom, hour: 0, minute: 0, second: 0 },
          timeZone,
        );
      }
      if (parsedTo) {
        toDate = fromZonedDateParts(
          { ...parsedTo, hour: 0, minute: 0, second: 0 },
          timeZone,
        );
      } else {
        toDate = fromDate;
      }
      if (toDate < fromDate) {
        [fromDate, toDate] = [toDate, fromDate];
      }
      break;
    }
    default:
      break;
  }

  const from = startOfZonedDay(fromDate, timeZone);
  const to = addDaysZoned(startOfZonedDay(toDate, timeZone), 1, timeZone);
  const totalDays = calculateDaysBetween(from, to, timeZone);
  const bucket = resolveBucket(rangeKey, totalDays);

  const label =
    rangeKey === "today"
      ? "Hoy"
      : rangeKey === "last7"
        ? "Últimos 7 días"
        : rangeKey === "last30"
          ? "Últimos 30 días"
          : rangeKey === "mtd"
            ? "Mes actual"
            : rangeKey === "ytd"
              ? "Año en curso"
              : `Del ${formatInTimeZone(fromDate, timeZone, {
                    day: "2-digit",
                    month: "short",
                  })} al ${formatInTimeZone(toDate, timeZone, {
                    day: "2-digit",
                    month: "short",
                  })}`;

  return {
    rangeKey,
    from,
    to,
    bucket,
    label,
    fromInput: formatDateInput(fromDate, timeZone),
    toInput: formatDateInput(toDate, timeZone),
    timeZone,
  };
}

export function normalizeBucketStart(date: Date, bucket: AnalyticsBucket, timeZone?: string) {
  const resolvedZone = timeZone ?? getAnalyticsTimeZone();
  if (bucket === "week") {
    return startOfZonedWeek(date, resolvedZone);
  }
  if (bucket === "month") {
    return startOfZonedMonth(date, resolvedZone);
  }
  return startOfZonedDay(date, resolvedZone);
}

export function buildBucketStarts(from: Date, to: Date, bucket: AnalyticsBucket, timeZone?: string) {
  const resolvedZone = timeZone ?? getAnalyticsTimeZone();
  const starts: Date[] = [];
  let cursor = normalizeBucketStart(from, bucket, resolvedZone);

  while (cursor < to) {
    starts.push(cursor);
    if (bucket === "month") {
      cursor = addMonthsZoned(cursor, 1, resolvedZone);
    } else {
      cursor = addDaysZoned(cursor, bucket === "week" ? 7 : 1, resolvedZone);
    }
  }

  return starts;
}
