# Security Deep Readiness

Date: 2026-08-29  
Branch: `security/remediation-standard-audit`  
Original reports preserved: `security-report.md`, `security-report-retest.md`.

## Executive Summary

SEC-008 is closed in application code. SEC-009 is mitigated in application code with server-side validation and regression coverage. CodeQL CI is configured using the official GitHub CodeQL Action v4.36.0 pinned to its verified release commit, but remote execution has not occurred. Clinical storage and staging remain externally verifiable blockers.

## Previous State

- Critical: 0; High: 0; Medium: 0; Low: 2.
- Posture score: 86/100.
- Focused security regression baseline: 11 files / 35 tests passed after the readiness changes.
- Baseline lint, typecheck and build passed.

## Blockers

| Blocker | Current state | Classification |
|---|---|---|
| Vercel Blob store access level | Code uses private upload/read, but no Vercel credential or store inspection was available | `PRIVATE STORE CONFIGURATION: UNVERIFIED` |
| Legacy clinical Blob objects | No inventory was executed against external storage; migration tooling is dry-run by default | `EXTERNAL ACTION REQUIRED` |
| CodeQL | Workflow configured; GitHub run not observed | `CODEQL CI CONFIGURED — REMOTE EXECUTION PENDING` |
| Security staging | No isolated database/storage/secrets endpoint was supplied | `NOT READY` |
| Test users | Matrix prepared; no users created outside a controlled staging database | `EXTERNAL ACTION REQUIRED` |

## Storage Security

Provider: Vercel Blob, SDK `@vercel/blob`.

Upload flow:

`professional/admin server request -> session and relationship checks -> private Blob upload -> ClinicalAttachment.storageKey`

Download flow:

`request -> current session -> clinical relationship/role check -> private Blob get(storageKey) -> no-store response stream`

The `ClinicalAttachment` model stores an internal `storageKey`, checksum and metadata. It does not store a signed URL. The legacy `Attachment` model still contains `url` and `dataUrl` fields and is handled by SEC-009 controls.

**PRIVATE STORE CONFIGURATION: UNVERIFIED.** Verify in Vercel by inspecting the Blob store access setting and listing only the dedicated staging store. Do not use production credentials for this check.

## Legacy Blob Migration

Script: `scripts/security/migrate-clinical-blobs.ts`.

- Default mode: DB inventory dry-run only.
- Execution requires both `--execute` and `SECURITY_BLOB_MIGRATION_APPROVED=1`.
- Execute mode lists only the `clinical/` prefix, verifies size/checksum, writes a private `clinical-private/` object, updates the DB key, then deletes the old object.
- It skips already migrated keys and records technical IDs only.
- No dry-run was executed because no isolated database/storage credentials are configured.
- Public objects found: unverified.
- Migrated: 0; no migration was executed.
- Pending: external inventory and authorized staging/production migration plan.

## SEC-008

Original root cause: public `/_monitoring?error=1` triggered a Sentry exception and could create telemetry noise/cost. Classification was `POSSIBLE`, CWE-770.

Change: require `x-monitoring-test-token` matching `MONITORING_TEST_TOKEN`; absent/invalid access returns 404 and never calls Sentry.

Evidence: `tests/monitoring-route.test.ts`, 2/2 passed. Status: `FIXED`.
Commit: `6936380`.

## SEC-009

Original root cause: legacy professional attachments accepted arbitrary external/data URLs and rendered them as links. Classification was `POSSIBLE`, CWE-79/CWE-601.

Change: server accepts HTTPS only; embedded data is restricted to base64 PDF/JPEG/PNG/WebP; unsafe legacy values are filtered on read; external links use `noopener noreferrer`.

Evidence: `tests/clinical-domain-hardening.spec.ts`, 4/4 passed. Status: `MITIGATED`.
Commit: `6e8fe1d`.

## CodeQL

Workflow: `.github/workflows/codeql.yml`.

- Language: `javascript-typescript`.
- Build mode: `none`, appropriate for this interpreted JS/TS analysis and avoids the failed local autobuild wrapper.
- Triggers: push/PR to `main`, weekly schedule and manual dispatch.
- Permissions: `contents: read`, `actions: read`, `security-events: write`.
- Action: official `github/codeql-action` v4.36.0, pinned to full SHA.

Status: `CODEQL CI CONFIGURED — REMOTE EXECUTION PENDING`. Do not mark PASS until a GitHub run completes and uploads the analysis result.

## Security Staging

Status: `NOT READY`.

Required isolated resources:

- independent PostgreSQL database and migration history
- dedicated private Blob store
- dedicated Upstash database or namespace
- staging-only `NEXTAUTH_SECRET`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, email and Sentry settings
- fictional data only, with outbound email/webhooks disabled or sandboxed
- logs available without passwords, tokens, cookies or PHI
- no production OAuth, payment, WhatsApp, SMS or webhook credentials

Current integration inventory from repository configuration:

| Integration | Current repository capability | Staging target |
|---|---|---|
| PostgreSQL/Prisma | Real database | Dedicated staging DB |
| Vercel Blob | Real storage SDK | Dedicated private staging store |
| Upstash | Distributed limiter | Dedicated DB/namespace |
| Resend/SMTP | Email | Mock/sandbox/disabled |
| Sentry | Telemetry | Dedicated DSN or disabled |
| Google OAuth/Places | OAuth/API | Mock/sandbox/disabled |
| Vercel deployment | Hosting | Separate preview/staging project |
| Payments/WhatsApp/SMS | No confirmed repository integration | Disabled unless separately verified |

## Test Users

See `security-test-matrix.md`. Roles and controlled cases are documented; provisioning is pending an isolated staging database.

## Authorization Matrix

The role/resource matrix is in `security-test-matrix.md`. The current schema has no tenant entity; cross-tenant testing is therefore not applicable until the data model changes.

## Security Regression Coverage

- Existing focused suite plus readiness changes: 35 tests passed in 11 files.
- New SEC-008 tests: 2.
- New SEC-009 coverage: 1 test with two unsafe-input cases; existing attachment hardening tests remain passing.
- Full filtered Vitest remains subject to the documented Windows native runner exit before discovery; no assertion failure was produced.

## Scanner Results

Final local re-test evidence: Semgrep project scan 10 contextual review signals, Gitleaks 0, OSV 0, pnpm audit 0, Grype 0, Trivy 0 actual vulnerabilities/secrets/misconfigurations, Checkov 204/0 and Syft SBOM 1,033 components. CodeQL is configured but remote validation is pending. No DAST, ZAP Active Scan or Nuclei was run.

## Remaining Risks

- Private Blob store and legacy object state are not externally verified.
- SEC-009 is mitigated, not a destructive removal of legacy fields; future migration to internal storage is recommended.
- Authenticated schedule response minimization remains a least-privilege follow-up.
- Cloud IAM and remote deployment settings were not inspected.

## External Actions Required

1. Create/provide isolated staging database, private Blob store, Upstash namespace and staging secrets.
2. Verify Blob store privacy and run the migration script dry-run against staging only.
3. Create the matrix users with fictional data and test role/ownership transitions.
4. Push this branch or merge the CodeQL workflow through the repository’s normal review path and provide a successful GitHub CodeQL run.
5. Define written scope and rollback controls before any future passive staging validation or Deep/DAST work.

## Deep Audit Readiness

**DEEP AUDIT READINESS: 82/100 — NOT READY**

Concrete blockers:

- `PRIVATE STORE CONFIGURATION: UNVERIFIED`.
- Legacy clinical storage inventory/migration dry-run not completed in isolated staging.
- CodeQL remote execution pending.
- Security staging and test users not provisioned.

The next step is to provision isolated Security Staging and perform the non-destructive Blob inventory plus CodeQL workflow run. Do not start `security-audit deep`, DAST, ZAP Active Scan or Nuclei until those four blockers have evidence.
