# Runbook: Deploy (Vercel)

## Build & validation
Run these commands locally before deploying:
1. `npm ci`
2. `npm run vercel-build`
3. `npm run lint`
4. `npm run typecheck`

## Required environment variables (Vercel)
Use `.env.example` as the source of truth. At minimum, configure:
- `DATABASE_URL` (Neon)
- `DATABASE_URL_UNPOOLED` (opcional)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`
- `AUTH_JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob)
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Optional but recommended:
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_TRACES_SAMPLE_RATE`
- `LOG_LEVEL`
- `CRON_SECRET` (protege los recordatorios de citas)
- `ANALYTICS_TIME_ZONE`, `CLINIC_NAME`, `CLINIC_CITY`, `CLINIC_ADDRESS`

## Database TLS recommendation
To avoid future TLS enforcement changes in `pg`, prefer:
- `DATABASE_URL=...&sslmode=verify-full`

If your provider requires libpq-compatible parameters:
- `DATABASE_URL=...&uselibpqcompat=true&sslmode=require`

## Migración de adjuntos clínicos
- La migración `make_clinical_attachment_data_nullable` deja `ClinicalAttachment.data` como nullable para compatibilidad.
- Si existen adjuntos históricos en la columna `data`, planifica un backfill a Vercel Blob mediante un script offline (fuera del repo) y luego elimina el uso de `data`.

## Notes
- Nunca commitear `.env` ni `.env.production`; solo mantener `.env.example` con placeholders.
- En previews (VERCEL_ENV distinto de `production`), las migraciones se omiten y el build pasa sin DB, pero el runtime puede requerirla para APIs/portales.
- When Upstash variables are not set, rate limiting falls back to in-memory limits (development only).
- Vercel Blob debe estar habilitado en el proyecto y `BLOB_READ_WRITE_TOKEN` configurado para adjuntos clínicos.
- Update CSP rules in `next.config.ts` when adding third-party scripts or assets.
- Vercel already caches Next.js builds; keep GitHub Actions using `actions/setup-node` with `cache: "npm"` to reuse `package-lock.json`.

## Next.js telemetry (optional)
To disable telemetry locally or in CI (optional):
1. `npx next telemetry disable`
