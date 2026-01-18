# Changelog Audit (Phase 0-1)

## [Unreleased]

### Added
- `RUNBOOK_OBSERVABILITY.md` and `SECURITY_MODEL.md` with production ops and authz coverage.
- Request ID middleware to propagate `x-request-id` across API responses.
- Authz helper utilities (`lib/authz.ts`) and memory rate limiter (`lib/rateLimit.ts`).
- Sentry edge configuration and safer Sentry defaults (PII off, low sample rate).
- API smoke, authz, and rate-limit tests via Vitest.
- RUNBOOK_DEPLOY.md with Vercel environment setup and SSL recommendations.
- Rate limit helper and Zod validation utilities for API routes.
- Pagination helper with consistent response shape for large listings.
- Environment documentation and security hardening notes.
- Sentry client/server initialization and monitoring endpoint.
- Structured logger for API audit events (appointments, user role changes, deletions).
- Icon wrapper to centralize Phosphor icon imports.
- Upgrade guides for Next.js 16 and Tailwind CSS v4.
- GitHub Actions workflow to run lint, test, and build on PRs.
- Prisma v7 configuration file (`prisma/prisma.config.ts`) to define datasource URLs outside schema files.
- Playwright smoke test for the marketing home hero panel.

### Changed
- API logs now emit structured JSON with requestId and sanitized fields.
- `buildPaginatedResponse` includes `items` while keeping backward compatibility.
- `/api/users` is now paginated and admin-only; receptionist patient flows moved to `/api/patients`.
- Search responses now include pagination metadata.
- Marked the marketing root page as dynamic to prevent prerender issues.
- Switched CSP to report-only mode while keeping other security headers intact.
- Expanded Zod validation across admin/professional CRUD endpoints and campaign/service/specialty updates.
- Applied `npm audit fix` (non-breaking) and updated the lockfile.
- Added SQLite adapter setup for analytics tests and updated KPI queries to support non-SQLite environments.
- Excluded generated Prisma test client output from linting and vitest scans.
- Disabled Cache Components to allow route segment configs (`dynamic`, `revalidate`).
- Added rate limiting to auth, appointment creation, and search endpoints.
- Added Zod validation for forgot/reset password and appointment creation payloads.
- Paginated appointment, patient, professional, service, and professional patient list endpoints.
- Updated front-end list fetches to consume paginated responses.
- Added baseline security headers (CSP, HSTS, referrer policy, permissions policy).
- Expanded `.env.example` to include all configuration keys.
- Upgraded Next.js, React, Prisma, Tailwind CSS, React Query, and eslint-config-next.
- Replaced `middleware.ts` with `proxy.ts` and enabled Cache Components.
- Migrated Tailwind configuration to CSS-first v4 and updated PostCSS config.
- Enabled Turbopack for local development.
- Confirmed `next-auth` latest stable remains v4.24.13; v5 evaluation deferred.
- Added npm overrides to resolve `cookie`, `diff`, and `hono` advisories without breaking upgrades.
- Documented telemetry opt-out and CI/Vercel caching guidance.
- Migrated Prisma datasource URLs to `prisma/prisma.config.ts` and removed `url`/`directUrl` from schema files; `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are now read by the config. (2026-01-16, commit: 00a09bc)
- Simplified Prisma client initialization to rely on Prisma config instead of manual datasource overrides. (2026-01-16, commit: 00a09bc)
- Implemented Phase 7 clinical data model (episodes, notes, prescriptions, attachments, templates, consents, and access logs).
- Added clinical API endpoints with zod validation, pagination, and role-based access control.
- Added secure clinical attachments via Vercel Blob with size/type validation and protected downloads.
- Added printable episode and prescription routes with audit logging.
- Added admin templates CRUD and audit log UI, plus patient consent UX.
- Added backup runbook and updated deployment/observability docs for clinical operations.

### Fixed
- Eliminated the `/` blank screen by forcing dynamic rendering and disabling revalidation.
- Safer fallbacks in API request handling for malformed inputs.
- Resolved missing React Hook dependency in notifications dropdown.
- Prevented marketing mobile menu from rendering when closed to avoid overlaying content.
- Avoided hard failure when `DATABASE_URL` is missing by short-circuiting the marketing campaign carousel.
- Marked the campaign carousel render as dynamic by reading request headers before using `new Date()` to avoid Next.js prerender current time errors.
- Replaced the app icon with an SVG to avoid binary assets and satisfy Turbopack decoding.
- Replaced Prisma connection overrides with driver adapter initialization for app and seed scripts.

### Security
- Centralized role checks and ownership validation across client/professional/appointment APIs.
- Added requestId propagation to support traceability without exposing secrets.
- Enforced rate limiting and input validation on critical routes.
- Added production-grade security headers.
- Resolved npm audit findings via overrides and refreshed environment recommendations.
- Enforced clinical access logging, soft deletes, and patient visibility gates for sensitive data.

### Audit Log
**Commands executed**
- `npm install next@latest react@latest react-dom@latest`
- `npm run build` (fails without `DATABASE_URL` or Prisma engine access)
- `npm install prisma@latest --save-dev`
- `npm install @prisma/client@latest`
- `npx prisma generate` (failed: Prisma 5.22.0 still expects datasource url)
- `npx prisma@7.2.0 generate` (failed: Prisma engine checksum 403)
- `npx prisma@7.2.0 migrate dev` (failed: Prisma engine checksum 403)
- `npx prisma generate` (failed: Prisma engine checksum 403)
- `npx prisma migrate dev --name upgrade_7_2` (failed: Prisma engine checksum 403)
- `npx @tailwindcss/upgrade --force`
- `npm install @tanstack/react-query@latest`
- `npm view next-auth version`
- `npm outdated`
- `npm install eslint-config-next@latest @types/node@25.0.9`
- `npm install @sentry/nextjs pino`
- `npm install eslint@8.57.1 --save-dev` (rolled back; re-upgraded to eslint 9)
- `npm install eslint@9.39.2 --save-dev`
- `npm install @typescript-eslint/parser@latest @typescript-eslint/eslint-plugin@latest --save-dev`
- `npm run lint`
- `npm run test`
- `npm run e2e`
- `npm run build` (failed: Prisma 5.22.0 still expects datasource url)

**Files modified**
- `proxy.ts`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/portal/layout.tsx`
- `app/appointments/new/page.tsx`, `app/auth/login/page.tsx`, `app/portal/[role]/page.tsx`
- `app/(marketing)/components/Navbar.tsx`, `app/(marketing)/components/CampaignCarousel.tsx`
- `app/portal/admin/_components/NotificationsDropdown.tsx`
- `app/api/appointments/route.ts`, `app/api/users/[id]/route.ts`
- `app/api/_monitoring/route.ts`, `lib/logger.ts`
- `app/globals.css`, `postcss.config.js`, `tsconfig.json`
- `components/ui/Icon.tsx` (plus icon import updates across components)
- `eslint.config.mjs`
- `package.json`, `package-lock.json`, `.env.example`, `README.md`
- `docs/UPGRADE_TO_NEXT16.md`, `docs/UPGRADE_TO_V4.md`
- `.github/workflows/ci.yml`
- `prisma/schema.prisma`, `prisma/schema.test.prisma`, `prisma/prisma.config.ts`
- `lib/prisma.ts`, `SECURITY_HARDENING.md`, `CHANGELOG_AUDIT.md`
- `.env`, `.env.production`
