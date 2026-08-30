# Security Staging Report

Date: 2026-08-30
Branch: `security/remediation-standard-audit`
Scope: repository-local preparation and read-only capability discovery. No staging or production resource was changed.

## Executive Summary

The repository is prepared for isolated Security Staging, but staging is not provisioned in this session. Vercel has no local credentials, so Blob privacy, deployment isolation and external storage contents are unverified. GitHub CLI is authenticated, but the branch has not been pushed and CodeQL remote execution has not been started.

## Infrastructure

| Component | Current evidence | Security Staging target |
|---|---|---|
| Application | Next.js 16 / Node 24 / pnpm | Separate Vercel project/deployment |
| Database | PostgreSQL through Prisma; provider not externally verified | Dedicated PostgreSQL database |
| Blob | `@vercel/blob` private application path | Dedicated private Blob store |
| Redis | Upstash integration in code | Dedicated DB or namespace |
| Secrets | `.env.example` names only | Staging-only values |

## Production Isolation

Status: `NOT VERIFIED`.

No production resource was queried or modified. The repository does not contain provider IDs sufficient to prove isolation. Verification requires authenticated provider inspection using staging-specific resources and must record only technical IDs/statuses, never secret values.

## Staging Deployment

Status: `NOT READY`.

No staging project, URL or deployment was supplied. No deployment was attempted.

## Database

Status: `EXTERNAL ACTION REQUIRED`.

The Prisma schema and migrations are available locally. The schema contains roles `PACIENTE`, `PROFESIONAL`, `RECEPCIONISTA` and `ADMINISTRADOR`, and no clinic/tenant model. A dedicated staging database must be created and migrated without copying production data.

## Blob Storage

Status: `UNVERIFIED`.

Application flow is private upload plus authorized server-side streaming through `ClinicalAttachment.storageKey`. The actual Vercel Blob store access mode cannot be confirmed without Vercel authentication. Required evidence is: private store setting, anonymous direct denial, authorized application access and unauthorized-user denial.

## Legacy Blob Dry Run

- Script: `scripts/security/migrate-clinical-blobs.ts`
- Dry-run executed: `NO`
- Scanned: 0
- Private: 0
- Public: unverified
- Migration candidates: unverified
- Failures: 0 observed; no external call made
- Reason: no isolated staging `DATABASE_URL` and Blob credentials are available.

The script defaults to DB-only inventory and requires `--execute` plus `SECURITY_BLOB_MIGRATION_APPROVED=1` for changes. No production migration is permitted.

## Upstash

Status: `NOT VERIFIED`.

The application has a conservative local fallback. Staging requires an isolated Upstash database or namespace. Controlled checks must cover provider available, provider error, timeout simulation and recovery without load testing or sensitive logging.

## External Integrations

| Integration | Repository capability | Staging classification |
|---|---|---|
| Resend/SMTP | Email sending | MOCK, SANDBOX or DISABLED |
| Sentry | Error/telemetry reporting | Dedicated DSN or DISABLED |
| Google OAuth/Places | Authentication/API integration | SANDBOX, MOCK or DISABLED |
| Vercel Blob | Clinical and marketing storage | Dedicated PRIVATE store |
| Upstash | Rate limiting | Dedicated database/namespace |
| Payments, WhatsApp, SMS | No confirmed current integration | NOT APPLICABLE unless discovered externally |
| AI/MCP | No application integration identified | NOT APPLICABLE based on repository evidence |

## Test Data

Status: `NOT READY`.

No synthetic data was created because there is no isolated staging database. The guarded seed uses only existing Prisma models and deterministic fictional values; it requires `SECURITY_STAGING=1`, `SECURITY_STAGING_CONFIRMATION=synthetic-v1` and a staging-only password variable.

## Test Identities

Status: `READY FOR PROVISIONING`, not provisioned. Detailed identity design: `security-test-identities.md`.

See `security-test-matrix.md`. Required identities cover all four real roles, two patients, two professionals, a disabled account and a role-change control. No production users were created or modified.

## Authorization Matrix

The matrix is documented in `security-test-matrix.md`. Cross-tenant cases are marked not applicable because the current Prisma schema has no tenant/clinic entity. Ownership, role and clinical relationship cases remain required.

## Authorization Validation

Status: `NOT RUN`.

No staging endpoint exists in the current session. Required controlled cases are same-owner allow, cross-user deny, cross-role deny, disabled-session deny, stale-session deny, clinical-file deny and direct API/server-boundary denial.

## Middleware Validation

Status: `NOT RUN`.

Local middleware/security regression tests pass, but external staging validation of UI, direct API and server route boundaries requires staging users and URL.

## CodeQL

Status: `CODEQL CI CONFIGURED - REMOTE EXECUTION PENDING`.

`.github/workflows/codeql.yml` uses the official CodeQL Action v4.36.0, full SHA pinning, `javascript-typescript`, `build-mode: none` and minimal permissions. GitHub CLI is authenticated, but the current branch has not been pushed and no workflow was started.

## Static Security Scanners

Fresh local baseline/retest:

- Focused security regression tests: 35/35 PASS in 11 files.
- Lint: PASS.
- Typecheck: PASS.
- Build: PASS, 130 static pages.
- Existing latest scanner evidence: Gitleaks 0, OSV 0, pnpm audit 0, Grype 0, Trivy 0 relevant results, Checkov 204/0, Syft 1,033 components.
- Semgrep: 10 contextual review signals, no blocker regression.
- No ZAP, Nuclei or active DAST was run.

## Orchestrator Ledger

| Workstream | Agent | Status | Dependencies | Evidence |
|---|---|---|---|---|
| A Vercel/staging | Orchestrator, no subagent API exposed | BLOCKED | Vercel auth and staging project | `vercel whoami`: no credentials |
| B Private Blob | Orchestrator | BLOCKED | Isolated Blob and DB | Local code/migration contract only |
| C Database | Orchestrator | BLOCKED | Staging DB provider | No isolated DB supplied |
| D Identities | Orchestrator | DONE for design; provisioning blocked | Staging DB and staging auth | `security-test-matrix.md`, `security-test-identities.md` |
| E Upstash | Orchestrator | BLOCKED | Isolated Upstash | No staging namespace supplied |
| F CodeQL | Orchestrator | BLOCKED remote | Branch push and GitHub run | Workflow configured; no remote run |
| G Integrations | Orchestrator | DONE for inventory | Provider configuration | Repository-based classification |
| H Deployment | Orchestrator | BLOCKED | A/C/E/G | No staging target |
| I Authorization | Orchestrator | BLOCKED | H + D | Matrix ready; no staging URL |
| J Middleware | Orchestrator | BLOCKED | H + D | Local tests pass; staging absent |

No subagent dispatch tool is exposed in this Codex session, so no agent execution is claimed. Workstreams were kept isolated by file scope and shared-state dependencies were serialized.

## Remaining Risks

- Actual Blob privacy and production/staging isolation are unverified.
- Legacy Blob inventory has not run against staging.
- CodeQL remote result is pending.
- No staging database, deployment, Upstash namespace or test identities exist in evidence.

## External Actions

1. Authorize/push this branch through the normal GitHub review path so CodeQL can run.
2. Create a separate Vercel staging project and private Blob store, or provide an authenticated official CLI session.
3. Create a separate PostgreSQL database and Upstash database/namespace with staging-only secrets.
4. Provision fictional staging data and the identities from `security-test-matrix.md`.
5. Configure email, telemetry and OAuth as mock, sandbox or disabled.

## Evidence

- Plan: `docs/plans/security-staging-deep-readiness.md`
- Design: `docs/superpowers/specs/2026-08-30-security-staging-deep-readiness-design.md`
- Readiness ledger: `security-deep-readiness.md`
- Identity/RBAC matrix: `security-test-matrix.md`
- Migration tooling: `scripts/security/migrate-clinical-blobs.ts`

## Deep Audit Readiness

**DEEP AUDIT READINESS: 82/100 - NOT READY**

This score is unchanged because no external acceptance evidence was obtained. The concrete blockers are Vercel private-store verification, isolated staging resources, synthetic identity provisioning, non-destructive staging Blob dry-run, CodeQL remote execution and passive staging authorization/middleware validation.
