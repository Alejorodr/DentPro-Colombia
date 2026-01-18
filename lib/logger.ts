type LogLevel = "info" | "warn" | "error";

type LogMeta = {
  msg?: string;
  route?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
};

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const PHONE_REGEX = /\+?\d[\d\s().-]{7,}\d/g;
const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "database_url",
  "databaseurl",
  "headers",
  "header",
];

function sanitizeString(value: string): string {
  const maskedEmails = value.replace(EMAIL_REGEX, (_match, user, domain) => `${user[0] ?? "*"}***@${domain}`);
  return maskedEmails.replace(PHONE_REGEX, "***");
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(data: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(data).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      acc[key] = "[REDACTED]";
      return acc;
    }
    acc[key] = sanitizeValue(value);
    return acc;
  }, {});
}

function formatLog(level: LogLevel, meta?: LogMeta | string, msg?: string) {
  const timestamp = new Date().toISOString();
  const metaObject = typeof meta === "string" ? {} : (meta ?? {});
  const message = typeof meta === "string" ? meta : msg ?? metaObject.msg ?? "";
  const { route, userId, requestId, msg: _metaMsg, ...rest } = metaObject;
  const entry = sanitizeObject({
    timestamp,
    level,
    msg: message,
    route,
    userId,
    requestId,
    ...rest,
  });

  return entry;
}

function emit(level: LogLevel, meta?: LogMeta | string, msg?: string) {
  const payload = formatLog(level, meta, msg);
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info(meta?: LogMeta | string, msg?: string) {
    emit("info", meta, msg);
  },
  warn(meta?: LogMeta | string, msg?: string) {
    emit("warn", meta, msg);
  },
  error(meta?: LogMeta | string, msg?: string) {
    emit("error", meta, msg);
  },
};
