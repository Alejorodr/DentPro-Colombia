const SENSITIVE_AUTH_FIELDS = new Set([
  "passwordHash",
  "passwordResetToken",
  "passwordResetTokenExpiresAt",
]);

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_AUTH_FIELDS.has(key)) {
      continue;
    }
    result[key] = redactValue(nested);
  }

  return result;
}

export function redactSensitiveAuthFields<T>(value: T): T {
  return redactValue(value) as T;
}
