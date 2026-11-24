# Runbook: Deploy (Vercel)

## Build & validation
Run these commands locally before deploying:
1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
3. `pnpm e2e:local` (Postgres efímero en Docker; nunca contra Neon)

## Required environment variables (Vercel)
Use `.env.example` as the source of truth. At minimum, configure:
- `DATABASE_URL` (Neon, incluyendo Preview y Production)
- `DATABASE_URL_UNPOOLED` (opcional, incluyendo Preview y Production)
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`
- `AUTH_JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `UPSTASH_REDIS_REST_URL` (o `KV_REST_API_URL` de la integración Upstash de Vercel)
- `UPSTASH_REDIS_REST_TOKEN` (o `KV_REST_API_TOKEN`). **Obligatorias en producción**: sin ellas el login responde 503.
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


### Neon SSL requirements (Preview + Production)
If your database host is Neon (`*.neon.tech`), configure **both** URLs with `sslmode=verify-full`:
- `DATABASE_URL=...&sslmode=verify-full`
- `DATABASE_URL_UNPOOLED=...&sslmode=verify-full`

This applies to **Preview and Production** environments in Vercel. Missing `sslmode=verify-full` can fail build/runtime validation.

## Database TLS recommendation
To avoid future TLS enforcement changes in `pg`, prefer:
- `DATABASE_URL=...&sslmode=verify-full`

If your provider requires libpq-compatible parameters:
- `DATABASE_URL=...&uselibpqcompat=true&sslmode=require`

## Migración de adjuntos clínicos
- `ClinicalAttachment.data` quedó como columna nullable y obsoleta: la app ya no la lee ni la escribe, los binarios viven en Vercel Blob privado.
- Los adjuntos que sigan en el prefijo público `clinical/` se migran con `scripts/security/migrate-clinical-blobs.ts` (ver DOG-32).

## Notes
- Nunca commitear `.env` ni `.env.production`; solo mantener `.env.example` con placeholders.
- En previews (VERCEL_ENV distinto de `production`), las migraciones se omiten; aun así, si apuntas a Neon debes mantener `DATABASE_URL`/`DATABASE_URL_UNPOOLED` con `sslmode=verify-full` para pasar validaciones de build/runtime.
- When Upstash variables are not set, rate limiting falls back to in-memory limits (development only).
- Vercel Blob debe estar habilitado en el proyecto y `BLOB_READ_WRITE_TOKEN` configurado para adjuntos clínicos.
- Update CSP rules in `next.config.ts` when adding third-party scripts or assets.
- Vercel already caches Next.js builds; GitHub Actions uses `actions/setup-node` with `cache: "pnpm"` to reuse `pnpm-lock.yaml`.

## Next.js telemetry (optional)
To disable telemetry locally or in CI (optional):
1. `npx next telemetry disable`
