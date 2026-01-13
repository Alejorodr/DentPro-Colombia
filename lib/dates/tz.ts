const DEFAULT_TIME_ZONE = "America/Bogota";

export type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getAnalyticsTimeZone() {
  return process.env.ANALYTICS_TIME_ZONE?.trim() || DEFAULT_TIME_ZONE;
}

export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const data = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(data.year),
    month: Number(data.month),
    day: Number(data.day),
    hour: Number(data.hour),
    minute: Number(data.minute),
    second: Number(data.second),
  };
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  );
  return utcGuess.getTime() - date.getTime();
}

export function fromZonedDateParts(parts: ZonedDateParts, timeZone: string) {
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  );
  const offset = getTimeZoneOffset(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

export function startOfZonedDay(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return fromZonedDateParts({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone);
}

export function startOfZonedWeek(date: Date, timeZone: string) {
  const dayStart = startOfZonedDay(date, timeZone);
  const dayOfWeek = dayStart.getUTCDay();
  const diff = (dayOfWeek + 6) % 7;
  return addDaysZoned(dayStart, -diff, timeZone);
}

export function startOfZonedMonth(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return fromZonedDateParts({ ...parts, day: 1, hour: 0, minute: 0, second: 0 }, timeZone);
}

export function startOfZonedYear(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return fromZonedDateParts({ ...parts, month: 1, day: 1, hour: 0, minute: 0, second: 0 }, timeZone);
}

export function addDaysZoned(date: Date, days: number, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, parts.hour, parts.minute, parts.second));

  return fromZonedDateParts(
    {
      year: candidate.getUTCFullYear(),
      month: candidate.getUTCMonth() + 1,
      day: candidate.getUTCDate(),
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
    },
    timeZone,
  );
}

export function addMonthsZoned(date: Date, months: number, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  const candidate = new Date(Date.UTC(parts.year, parts.month - 1 + months, parts.day, parts.hour, parts.minute, parts.second));

  return fromZonedDateParts(
    {
      year: candidate.getUTCFullYear(),
      month: candidate.getUTCMonth() + 1,
      day: candidate.getUTCDate(),
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
    },
    timeZone,
  );
}

export function formatDateInput(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day
    .toString()
    .padStart(2, "0")}`;
}

export function formatInTimeZone(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-CO", { ...options, timeZone }).format(date);
}

