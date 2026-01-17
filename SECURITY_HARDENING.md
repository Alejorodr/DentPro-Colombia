# Security Hardening (Phase 0-1)

## Summary
This phase focuses on critical quick wins: rate limiting, input validation, pagination controls, baseline security headers, and environment separation guidance. Phase 2-3 adds observability and audit logging.

## Implemented
- **Rate limiting** on sensitive endpoints (forgot/reset password, appointment creation, search) with Upstash Redis support and an in-memory fallback for local development.
- **Input validation** with Zod for auth and appointment creation, plus bounded search queries.
- **Pagination** for large listings (`/api/appointments`, `/api/patients`, `/api/professionals`, `/api/services`, `/api/professional/patients`).
- **Security headers** (HSTS in production, CSP report-only, Permissions-Policy, Referrer-Policy, X-Frame-Options, X-Content-Type-Options).
- **Environment separation** documented for Vercel.
- **Observability baseline** with Sentry client/server initialization and `/api/_monitoring` endpoint.
- **Structured audit logs** for appointment creation and user role changes/deletions.
- **Expanded input validation** with Zod for admin/professional CRUD endpoints and marketing campaign updates.

## Pending / Phase 2-3
- Alerting/notification routing for Sentry events and dashboards.
- Stronger CSP with nonces and removal of `unsafe-eval` where possible.
- Additional authorization checks for remaining ID-based endpoints not touched in this phase.

## Dependency audit (Phase 4-7)
**Commands executed**
- `npm audit`
- `npm audit fix`
- `npm install` (with npm overrides)

**Resolved findings (non-breaking)**
- `cookie` pinned to `0.7.2` via npm overrides to address `@auth/core` advisory.
- `diff` pinned to `8.0.3` via npm overrides for the jsdiff DoS advisory.
- `hono` pinned to `4.11.4` via npm overrides for Prisma `@prisma/dev` dependency chain.

**Remaining findings**
- None (npm audit reports 0 vulnerabilities).

## Environment warnings & recommendations
- `npm warn Unknown env config "http-proxy"` appears in CI; no `.npmrc` exists in the repo, so this likely comes from runner environment configuration (unset `http-proxy` if possible).
- `pg` TLS defaults may tighten in future releases; update Vercel `DATABASE_URL` to include `sslmode=verify-full` (preferred) or `uselibpqcompat=true&sslmode=require`.
- Prisma's pooled Postgres client currently sets `ssl.rejectUnauthorized=false` for provider compatibility; remove once the connection string enforces `sslmode=verify-full`.

## Environment configuration (Vercel)
### Prisma (database connection)
Set the following in Vercel for **Preview** and **Production**:
- `DATABASE_URL` (pooled connection string for Neon/PostgreSQL)
- `DATABASE_URL_UNPOOLED` (non-pooled connection string for migrations, if used)

### Upstash (rate limiting)
Set the following in Vercel for **Preview** and **Production**:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Notes
- When Upstash is not configured, rate limiting falls back to in-memory limits in development only.
- If you add third-party scripts or assets, update the CSP in `next.config.ts` accordingly.

## Audit Log
**Commands executed**
- `npm install @sentry/nextjs pino`
- `npm install next@latest react@latest react-dom@latest`
- `npm install prisma@latest --save-dev`
- `npm install @prisma/client@latest`
- `npx prisma generate` (failed: Prisma engine checksum 403)
- `npx prisma migrate dev --name upgrade_7_2` (failed: Prisma engine checksum 403)

**Files modified**
- `app/api/_monitoring/route.ts`, `lib/logger.ts`
- `app/api/appointments/route.ts`, `app/api/users/[id]/route.ts`
- `sentry.client.config.ts`, `sentry.server.config.ts`
- `.env.example`
