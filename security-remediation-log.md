# DentPro Security Remediation Log

## Scope

- Repository: DentPro-Colombia
- Branch: `security/remediation-standard-audit`
- Baseline report: `security-report.md` (preserved unchanged)
- Scope: local repository, local tests and static analysis only
- Explicitly excluded: production, Internet, third-party systems, DAST, ZAP Active Scan, Nuclei, brute force, fuzzing, load testing and destructive actions

## Initial State

Recorded before remediation changes on 2026-08-29:

- Worktree contained only pre-existing untracked audit artifacts: `SECURITY-TOOLS.md`, `security-report.md`, `security-results/`.
- Application source was not modified before this remediation branch.
- Initial audit findings: 0 Critical, 2 High, 5 Medium, 2 Low, 3 Info.
- Initial confirmed findings: 2; potential/probable findings: 7.

## Baseline Validation

Recorded before source changes on 2026-08-29.

| Check | Command | Result | Evidence |
|---|---|---|---|
| Tests | `pnpm exec vitest run --maxWorkers=1 --pool=threads --exclude "security-results/**" --exclude ".agents/**" --exclude ".claude/**"` | PASS: 76 files, 257 tests | Baseline completed 2026-08-29; standard command also discovers audit artifacts and was stopped |
| Lint | `pnpm run lint` | PASS | Baseline completed 2026-08-29 |
| Typecheck | `pnpm run typecheck` | PASS | Baseline completed 2026-08-29 |
| Build | `pnpm run build` | PASS: Next.js 16.3.0, 130 static pages generated | Baseline completed 2026-08-29 |

## Remediation Entries

No remediation has been applied yet. Baseline: 76 test files / 257 tests passed, lint passed, typecheck passed and production build passed. The package test command discovers pre-existing audit artifacts under `security-results`; the reproducible baseline command excludes those artifacts and `.agents`/`.claude` trees.

### SEC-001 - Session and token revocation

- Root cause: custom JWT decode trusted historical role/profile claims and did not consult current account state.
- Design: resolve token identity against the current database user; reject inactive users, role mismatches, invalid identity claims and tokens issued before `passwordChangedAt`.
- Files: `auth.ts`, `lib/auth/session.ts`, `app/api/users/[id]/route.ts`.
- Tests: `lib/auth/__tests__/session.test.ts`, `tests/auth.spec.ts`, `app/api/users/[id]/__tests__/patch-guards.test.ts`.
- Evidence: targeted suite passed, 17 tests.
- Commit: `7dec97a security: harden session and token revocation`.
- Status: FIXED for server-side session resolution; middleware still uses token claims for routing only and requires a dedicated staging check before deep audit.

### SEC-002 - Private clinical attachments

- Root cause: clinical upload used public Blob storage and download redirected to the provider URL.
- Design: upload with `access: "private"`; authorize in DentPro, then stream with `get()` and private no-store response headers.
- Files: `lib/clinical/attachments.ts`, `app/api/clinical/episodes/[episodeId]/attachments/route.ts`, `app/api/clinical/attachments/[attachmentId]/download/route.ts`.
- Tests: `tests/attachments.test.ts`, `tests/clinical-attachments-authz.spec.ts`.
- Evidence: targeted suite passed, 5 tests.
- Commit: `3c56cda security: protect clinical attachments`.
- Status: MITIGATED in application code. A private Vercel Blob store and migration/re-upload of existing public clinical objects are deployment prerequisites; no external storage was changed.

### SEC-003 - Stored HTML sanitization

- Root cause: ad-hoc regex sanitization allowed active HTML contexts and dangerous URL schemes to reach two render sinks.
- Design: parser-based `sanitize-html` allowlist limited to document text/formatting tags and safe link schemes.
- Files: `lib/security/sanitize-html.ts`, `tests/attachments.test.ts`, `package.json`, `pnpm-lock.yaml`.
- Tests: script, event handler, JavaScript URL, SVG, iframe, style and malformed-content regression cases.
- Evidence: targeted suite passed, 3 tests.
- Commit: `2bb5940 security: harden html rendering and sanitization`.
- Status: FIXED for the identified stored-template sinks; CSP remains defense-in-depth and was not treated as the primary control.

### SEC-004 - Rate limiting fallback

- Root cause: production returned `null` when Upstash was absent; proxy swallowed Upstash failures and allowed requests.
- Design: conservative in-memory fallback for missing configuration and provider errors, with 429 responses and one warning per process.
- Files: `app/api/_utils/ratelimit.ts`, `proxy.ts`, `tests/rate-limit-fallback.test.ts`.
- Tests: production without Upstash and configured Upstash throwing; 3 tests passed including existing memory limiter test.
- Commit: `050826d security: harden rate limiting fallback`.
- Status: FIXED for fail-open behavior. Distributed protection still depends on healthy Upstash in multi-instance deployments.

### SEC-005 - GitHub Actions supply chain

- Root cause: workflows used mutable release tags and CI/E2E had no explicit restrictive top-level permissions.
- Design: pin every existing action to the verified full SHA of its current official tag; declare `contents: read` for CI/E2E; retain release write permissions only where Changesets requires them.
- Files: `.github/workflows/ci.yml`, `e2e-nightly.yml`, `e2e-smoke.yml`, `release.yml`.
- Tests/evidence: Checkov GitHub Actions re-scan passed 184 checks / 0 failures; Semgrep workflow re-scan found 0 findings.
- Commit: `600f2dc security: harden github actions supply chain`.
- Status: FIXED for the identified mutable-reference and implicit-permission findings.

### SEC-006 - Public schedule enumeration

- Root cause: legacy `/api/schedules` queried all time slots without authentication or bounded projection; its authenticated page did not forward cookies.
- Design: require server-side session and forward the existing request cookie for the internal authenticated page fetch.
- Files: `app/api/schedules/route.ts`, `app/(dashboard)/[role]/schedules/page.tsx`, `app/api/schedules/__tests__/route.test.ts`.
- Evidence: anonymous 401 and authenticated response tests passed, 2 tests.
- Commit: `fe0cef1 security: restrict public schedule and registration`.
- Status: FIXED for anonymous enumeration; the response remains broad for authenticated users and should be narrowed in a later least-privilege review.

### SEC-007 - Registration abuse and account enumeration

- Root cause: registration lacked endpoint-specific throttling and returned a distinct duplicate-email status/message.
- Design: apply `enforceRateLimit` before parsing/creating and return the same success-shaped response for duplicate registration attempts.
- Files: `app/api/auth/register/route.ts`, `app/api/auth/__tests__/register-rate-limit.test.ts`.
- Evidence: rate-limit short-circuit test passed.
- Commit: `fe0cef1 security: restrict public schedule and registration`.
- Status: FIXED for the identified controls; distributed enforcement still depends on the hardened fallback/Upstash configuration.

## Regression and Re-test Evidence

- Focused security regression suite: PASS, 9 files / 29 tests on 2026-08-29.
- Lint after remediation: PASS.
- Typecheck after remediation: PASS.
- Build after remediation: PASS, Next.js 16.3.0, 130 static pages generated.
- Full filtered suite was attempted twice after remediation. The first run exposed and then isolated a test mock defect in `middleware.test.ts`; the corrected focused suite passed. The second full run terminated before test discovery with Windows native exit code `-1073741819`, without a test assertion or stack trace. This is recorded as runner/environment instability, not as a remediation failure.
- Semgrep project re-scan: 10 review signals remain, covering `.npmrc`, E2E/dev scripts, Ajv configuration and two reviewed HTML sinks; no new auth, attachment, rate-limit or workflow finding.
- Semgrep workflow re-scan: 0 findings.
- Gitleaks: 0 leaks across 643 commits.
- OSV lockfile scan: 0 vulnerabilities.
- pnpm audit: 0 advisories at all severities.
- Syft: 1,030 project SBOM components generated.
- Grype against project SBOM: 0 matches.
- Trivy broad output contained secret false positives from generated CodeQL/audit database fixtures; those artifacts were excluded from the project evidence and no repository secret was identified by Gitleaks.
- Checkov GitHub Actions re-scan: 184 passed / 0 failed.
- CodeQL: incomplete. The local CLI repeatedly entered the JavaScript autobuild wrapper and did not complete database creation; no CodeQL result is claimed.
