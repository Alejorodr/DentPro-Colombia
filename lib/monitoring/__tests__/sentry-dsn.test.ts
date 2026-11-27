import { afterEach, describe, expect, it, vi } from "vitest";

import { sentryDsn } from "@/lib/monitoring/sentry-dsn";

describe("sentryDsn", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("queda apagado sin ninguna variable", () => {
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    expect(sentryDsn()).toBeUndefined();
  });

  it("usa el DSN que inyecta la integración de Vercel", () => {
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", " https://public@o1.ingest.sentry.io/2 ");
    expect(sentryDsn()).toBe("https://public@o1.ingest.sentry.io/2");
  });

  it("prioriza SENTRY_DSN cuando está configurado", () => {
    vi.stubEnv("SENTRY_DSN", "https://server@o1.ingest.sentry.io/3");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@o1.ingest.sentry.io/2");
    expect(sentryDsn()).toBe("https://server@o1.ingest.sentry.io/3");
  });

  it("ignora un SENTRY_DSN en blanco", () => {
    vi.stubEnv("SENTRY_DSN", "   ");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@o1.ingest.sentry.io/2");
    expect(sentryDsn()).toBe("https://public@o1.ingest.sentry.io/2");
  });
});
