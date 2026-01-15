# Security Hardening (Phase 0-1)

## Summary
This phase focuses on critical quick wins: rate limiting, input validation, pagination controls, baseline security headers, and environment separation guidance.

## Implemented
- **Rate limiting** on sensitive endpoints (forgot/reset password, appointment creation, search) with Upstash Redis support and an in-memory fallback for local development.
- **Input validation** with Zod for auth and appointment creation, plus bounded search queries.
- **Pagination** for large listings (`/api/appointments`, `/api/patients`, `/api/professionals`, `/api/services`, `/api/professional/patients`).
- **Security headers** (HSTS in production, CSP, Permissions-Policy, Referrer-Policy, X-Frame-Options, X-Content-Type-Options).
- **Environment separation** documented for Vercel.

## Pending / Phase 2-3
- Observability (Sentry/OTel), audit logging, alerting.
- Stronger CSP with nonces and removal of `unsafe-eval` where possible.
- Prisma/Next/Tailwind major upgrades if needed for vulnerabilities.
- Additional authorization checks for remaining ID-based endpoints not touched in this phase.

## Environment configuration (Vercel)
### Upstash (rate limiting)
Set the following in Vercel for **Preview** and **Production**:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Notes
- When Upstash is not configured, rate limiting falls back to in-memory limits in development only.
- If you add third-party scripts or assets, update the CSP in `next.config.ts` accordingly.

