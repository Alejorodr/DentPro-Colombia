export type AnalyticsBucket = "day" | "week";
export type AnalyticsRangeKey = "today" | "7d" | "30d" | "mtd" | "custom";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type AnalyticsRange = {
  rangeKey: AnalyticsRangeKey;
  from: Date;
  to: Date;
  bucket: AnalyticsBucket;
  label: string;
  fromInput: string;
  toInput: string;
};

function getParam(value?: string | string[]) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function startOfUtcWeek(date: Date) {
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  return addDaysUtc(startOfUtcDay(date), -diff);
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatRangeLabel(date: Date) {
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  });
}

function parseDateInput(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function parseRange(searchParams: {
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
}): AnalyticsRange {
  const rangeParam = getParam(searchParams.range) ?? "7d";
  const rangeKey: AnalyticsRangeKey =
    rangeParam === "today" || rangeParam === "7d" || rangeParam === "30d" || rangeParam === "mtd"
      ? rangeParam
      : "custom";
  const todayStart = startOfUtcDay(new Date());

  let fromDate = todayStart;
  let toDate = todayStart;

  switch (rangeKey) {
    case "today":
      fromDate = todayStart;
      toDate = todayStart;
      break;
    case "7d":
      fromDate = addDaysUtc(todayStart, -6);
      toDate = todayStart;
      break;
    case "30d":
      fromDate = addDaysUtc(todayStart, -29);
      toDate = todayStart;
      break;
    case "mtd":
      fromDate = startOfUtcMonth(todayStart);
      toDate = todayStart;
      break;
    case "custom": {
      const parsedFrom = parseDateInput(getParam(searchParams.from));
      const parsedTo = parseDateInput(getParam(searchParams.to));
      fromDate = parsedFrom ?? todayStart;
      toDate = parsedTo ?? fromDate;
      if (toDate < fromDate) {
        [fromDate, toDate] = [toDate, fromDate];
      }
      break;
    }
    default:
      break;
  }

  const from = startOfUtcDay(fromDate);
  const to = addDaysUtc(startOfUtcDay(toDate), 1);
  const totalDays = Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
  const bucket: AnalyticsBucket = totalDays > 31 ? "week" : "day";

  const label =
    rangeKey === "today"
      ? "Hoy"
      : rangeKey === "7d"
        ? "Últimos 7 días"
        : rangeKey === "30d"
          ? "Últimos 30 días"
          : rangeKey === "mtd"
            ? "Mes actual"
            : `Del ${formatRangeLabel(fromDate)} al ${formatRangeLabel(toDate)}`;

  return {
    rangeKey,
    from,
    to,
    bucket,
    label,
    fromInput: formatDateInput(fromDate),
    toInput: formatDateInput(toDate),
  };
}

export function normalizeBucketStart(date: Date, bucket: AnalyticsBucket) {
  return bucket === "week" ? startOfUtcWeek(date) : startOfUtcDay(date);
}

export function buildBucketStarts(from: Date, to: Date, bucket: AnalyticsBucket) {
  const starts: Date[] = [];
  let cursor = normalizeBucketStart(from, bucket);

  while (cursor < to) {
    starts.push(cursor);
    cursor = addDaysUtc(cursor, bucket === "week" ? 7 : 1);
  }

  return starts;
}
