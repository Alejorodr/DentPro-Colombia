# Environment Configuration

This project separates **Development**, **Preview/Staging**, and **Production** environments to avoid sharing secrets and data.

## Required variables (all environments)
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET` (or `AUTH_JWT_SECRET` / `AUTH_SECRET`)
- `NEXT_PUBLIC_APP_URL`
- `AUTH_TRUST_HOST`
- `RESEND_API_KEY`
- `EMAIL_FROM`

## Optional but recommended
- `ANALYTICS_TIME_ZONE` (defaults to `America/Bogota`)
- `CLINIC_NAME`, `CLINIC_CITY`, `CLINIC_ADDRESS`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (required for production rate limiting)
- `OPS_ENABLED`, `OPS_KEY` (ops endpoints)

## Test-only variables
- `TEST_AUTH_BYPASS`, `TEST_AUTH_EMAIL`, `TEST_AUTH_PASSWORD`, `TEST_AUTH_ROLE`
- `RUN_E2E`, `PLAYWRIGHT_BROWSERS_PATH`

## Vercel configuration
1. **Development**: set a local DB, local app URL, and auth secret.
2. **Preview**: use a dedicated staging DB or a separate schema. Set `NEXTAUTH_URL` to the preview URL and unique secrets.
3. **Production**: use a dedicated production DB and production secrets.

### Recommended database strategy (Neon/Postgres)
- **Option A**: One database per environment (dev, staging, prod).
- **Option B**: Single database with isolated schemas per environment.

## Prisma scripts
Add environment-specific workflow:
- `npm run prisma generate` (already included in build)
- `npx prisma migrate deploy` (staging/production)
- `npx prisma db push` (development only)

