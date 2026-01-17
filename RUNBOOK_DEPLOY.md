# Runbook: Deploy (Vercel)

## Build & validation
Run these commands locally before deploying:
1. `npm ci`
2. `npm run vercel-build`
3. `npm run lint`
4. `npm run typecheck`

## Required environment variables (Vercel)
Use `.env.example` as the source of truth. At minimum, configure:
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`
- `AUTH_JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`

Optional but recommended:
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- `OPS_ENABLED`, `OPS_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`
- `ANALYTICS_TIME_ZONE`, `CLINIC_NAME`, `CLINIC_CITY`, `CLINIC_ADDRESS`

## Database TLS recommendation
To avoid future TLS enforcement changes in `pg`, prefer:
- `DATABASE_URL=...&sslmode=verify-full`

If your provider requires libpq-compatible parameters:
- `DATABASE_URL=...&uselibpqcompat=true&sslmode=require`

## Notes
- When Upstash variables are not set, rate limiting falls back to in-memory limits (development only).
- Update CSP rules in `next.config.ts` when adding third-party scripts or assets.
