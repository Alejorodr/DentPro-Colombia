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
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `BLOB_READ_WRITE_TOKEN` (adjuntos clínicos privados)

Optional but recommended:
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_TRACES_SAMPLE_RATE`
- `LOG_LEVEL`
- `OPS_ENABLED`, `OPS_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- `ANALYTICS_TIME_ZONE`, `CLINIC_NAME`, `CLINIC_CITY`, `CLINIC_ADDRESS`

## Database TLS recommendation
To avoid future TLS enforcement changes in `pg`, prefer:
- `DATABASE_URL=...&sslmode=verify-full`

If your provider requires libpq-compatible parameters:
- `DATABASE_URL=...&uselibpqcompat=true&sslmode=require`

## Notes
- Nunca commitear `.env` ni `.env.production`; solo mantener `.env.example` con placeholders.
- En previews (VERCEL_ENV distinto de `production`), las migraciones se omiten y el build pasa sin DB, pero el runtime puede requerirla para APIs/portales.
- When Upstash variables are not set, rate limiting falls back to in-memory limits (development only).
- Update CSP rules in `next.config.ts` when adding third-party scripts or assets.
- Vercel already caches Next.js builds; keep GitHub Actions using `actions/setup-node` with `cache: "npm"` to reuse `package-lock.json`.

## Next.js telemetry (optional)
To disable telemetry locally or in CI (optional):
1. `npx next telemetry disable`
