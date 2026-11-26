import * as Sentry from "@sentry/nextjs";

import { scrubSentryEvent } from "@/lib/monitoring/sentry-scrub";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
});
