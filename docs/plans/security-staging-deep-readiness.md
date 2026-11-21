# DentPro Security Staging Deep Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare and verify an isolated synthetic-data DentPro Security Staging environment and collect evidence required for Deep Audit readiness without touching production or executing active attack tooling.

**Architecture:** Keep production completely separate from a dedicated staging deployment, PostgreSQL database, private Vercel Blob store, Upstash namespace/database and staging-only secrets. Finish repository-local contracts first, then perform authenticated external provisioning only against staging. Use explicit evidence gates before any controlled validation.

**Tech Stack:** Next.js 16, Node 24, pnpm, Prisma/PostgreSQL, NextAuth, Vercel Blob, Upstash, GitHub Actions, CodeQL, Vitest, Semgrep, Gitleaks, OSV Scanner, Trivy, Checkov, Syft and Grype.

## Global Constraints

- Production is `READ-ONLY` when strictly necessary for configuration discovery; no production writes, migrations, deletions, users, variables, scans or offensive requests.
- Security Staging is authorized for synthetic data and controlled functional security validation only.
- Do not run `security-audit deep`, ZAP Active Scan, Nuclei, fuzzing, brute force, DoS, load testing, exploitation or destructive tests.
- Do not copy production data or secrets into staging or documentation.
- Do not modify `security-report.md`.
- Do not update dependencies unless a failing verification proves it is necessary.
- Every external claim must be marked `VERIFIED`, `UNVERIFIED` or `EXTERNAL ACTION REQUIRED` with command/output evidence.
- Workstreams that modify overlapping files are serialized.
- Every code/config change ends with focused verification, diff review and a small commit.

---

### Task 1: Baseline and Orchestrator Ledger

**Files:**
- Create: `security-deep-readiness.md` update section `Execution Ledger`
- Create: `security-staging-report.md`
- Read: `security-report.md`, `security-report-retest.md`, `security-remediation-log.md`

**Steps:**

- [ ] Confirm branch and worktree with `git status --short --branch` and record pre-existing untracked audit artifacts without staging them.
- [ ] Run `pnpm run lint`, `pnpm run typecheck`, `pnpm run build` and the focused security suite using the established exclusions for `security-results`, `.agents`, `.claude` and `.codex`.
- [ ] Record exact pass/fail counts, exit codes and the known full-Vitest Windows runner limitation in `security-deep-readiness.md`.
- [ ] Add an orchestrator ledger with statuses `PENDING`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `FAILED` and evidence columns for workstreams A-J.
- [ ] Commit only the documentation baseline as `docs: establish security staging baseline`.

Expected result: clean repository source state, reproducible baseline evidence, and no external side effects.

### Task 2: Repository-Local Storage and Migration Contract

**Files:**
- Read: `lib/clinical/attachments.ts`
- Read: `app/api/clinical/episodes/[episodeId]/attachments/route.ts`
- Read: `app/api/clinical/attachments/[attachmentId]/download/route.ts`
- Read: `prisma/schema.prisma`
- Read: `scripts/security/migrate-clinical-blobs.ts`
- Modify only if verification finds a concrete defect: `scripts/security/migrate-clinical-blobs.ts`
- Test only if verification finds a concrete defect: existing clinical attachment test files

**Steps:**

- [ ] Map `ClinicalAttachment.storageKey`, checksum, size and MIME flow from upload to download; separately map legacy `Attachment.url`/`dataUrl`.
- [ ] Verify that the migration script defaults to DB-only dry-run, requires `--execute` and `SECURITY_BLOB_MIGRATION_APPROVED=1`, verifies checksum/size before update, writes private objects and avoids PHI logging.
- [ ] Do not run the script until a staging-only `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` are confirmed; with no such target, record `EXTERNAL ACTION REQUIRED`.
- [ ] If a defect is found, write a failing focused test, apply the smallest fix, run the test, run typecheck/lint, review the diff and commit `security: harden staging blob migration tooling`.

Expected result: migration contract is locally verified and no external Blob call is made without explicit staging credentials and execute approval.

### Task 3: CodeQL CI Verification

**Files:**
- Read: `.github/workflows/codeql.yml`, `.github/workflows/ci.yml`, `package.json`, `pnpm-lock.yaml`
- Modify only if the remote run reports a concrete failure: `.github/workflows/codeql.yml`

**Steps:**

- [ ] Verify all CodeQL action references use a full SHA and that permissions are limited to `contents: read`, `actions: read` and `security-events: write`.
- [ ] Verify the workflow targets `javascript-typescript`, uses `build-mode: none`, and triggers only on `main` push/PR, schedule and manual dispatch.
- [ ] If GitHub authentication and push authorization are unavailable, record `CODEQL CI CONFIGURED — REMOTE EXECUTION PENDING`; do not claim PASS.
- [ ] If authorized, push only the prepared branch through the normal repository path and inspect the actual GitHub run and uploaded code-scanning result.
- [ ] On failure, follow systematic debugging: capture the complete job log, identify the failing boundary, make one minimal fix, rerun once, and record the evidence.
- [ ] Commit any required workflow fix separately as `ci: fix codeql security analysis`.

Expected result: `CODEQL PASS` only from a completed GitHub Actions run; otherwise a concrete remote blocker.

### Task 4: Isolated Staging Provisioning Gate

**Files:**
- Modify: `security-deep-readiness.md`
- Create/update: `security-staging-report.md`
- Read: `docs/ENVIRONMENTS.md`, `vercel.json`, `.env.example`, `scripts/vercel-prisma.mjs`

**Steps:**

- [ ] Discover provider/project names using official authenticated CLI/API only; never scrape provider UI when an official mechanism exists.
- [ ] Confirm the intended staging project, branch, URL and environment before provisioning.
- [ ] Require separate PostgreSQL, Blob, Upstash and secrets. Record only variable names and `CONFIGURED`/`UNCONFIGURED` state.
- [ ] Refuse to continue if any requested resource resolves to production or shares production credentials.
- [ ] Provision only after the user provides/authorizes the external action; otherwise record each missing resource as `EXTERNAL ACTION REQUIRED`.
- [ ] Record provider identifiers, isolation evidence, rollback/version strategy and no-data-copy policy without writing secret values.
- [ ] Commit documentation/config templates only as `infra: document isolated security staging`.

Expected result: either independently verifiable staging resources or a precise blocked ledger; never a simulated READY state.

### Task 5: Synthetic Database and Identities

**Files:**
- Read: `prisma/schema.prisma`, `prisma/seed.ts`, existing test fixtures
- Create only after isolated staging exists: `scripts/security/seed-security-staging.ts`
- Create/update: `security-test-identities.md`, `security-test-matrix.md`

**Steps:**

- [ ] Confirm actual Prisma models and role enum; do not create clinic/tenant entities because none exist in the current schema.
- [ ] Define synthetic records for users, professional profiles, patient profiles, appointments, clinical episodes, notes, prescriptions and attachments only where models exist.
- [ ] Ensure the seed is deterministic, idempotent, staging-only and contains no real names, emails, phone numbers, PHI or production identifiers.
- [ ] Provision one active user for each real role, patient A/B, professional A/B, disabled control and role-change control in staging only.
- [ ] Verify login and role transitions through the staging application, not direct production DB edits.
- [ ] Commit seed/identity artifacts separately as `security: add synthetic staging identities`.

Expected result: identities `READY` only after staging creation and controlled login evidence.

### Task 6: Blob Privacy and Legacy Dry Run in Staging

**Files:**
- Modify: `security-staging-report.md`
- Modify: `security-deep-readiness.md`

**Steps:**

- [ ] Inspect the dedicated staging Blob store access mode through the official provider mechanism and record `PRIVATE VERIFIED` only with external evidence.
- [ ] Run `scripts/security/migrate-clinical-blobs.ts` without `--execute` against staging-only variables.
- [ ] Record counts for scanned, already-private, public/candidate, missing and integrity-failed objects using technical IDs only.
- [ ] From staging, verify anonymous direct access denied, authorized API download allowed, unrelated user denied and disabled user denied.
- [ ] Do not run `--execute` unless the user separately authorizes a staging-only migration after reviewing the dry-run.
- [ ] If migration is authorized, execute only with the explicit approval variable, preserve checksums, verify DB references and record old-object deletion result.
- [ ] Commit only evidence/docs as `security: verify private staging blob storage` or tooling fixes as a separate commit.

Expected result: `PRIVATE VERIFIED` plus a recorded dry-run, or an explicit external blocker.

### Task 7: Integration Isolation and Upstash Validation

**Files:**
- Modify: `security-staging-report.md`, `security-deep-readiness.md`
- Read: `.env.example`, email, Sentry, OAuth, Blob and rate-limit modules

**Steps:**

- [ ] Inventory email, Sentry, OAuth/Places, Blob, Upstash, webhooks, payments, SMS, WhatsApp and AI/MCP integrations from code/config.
- [ ] Classify each staging integration as `SANDBOX`, `MOCK`, `DISABLED` or `NOT APPLICABLE`; reject production credentials.
- [ ] Verify Upstash uses an isolated database/namespace and record connectivity without logging tokens or request data.
- [ ] Run only controlled rate-limit cases: primary available, provider error, timeout simulation and recovery; no load test.
- [ ] Verify logs contain no password, token, cookie or PHI values.
- [ ] Commit evidence as `infra: isolate security staging integrations`.

Expected result: staging integration isolation verified or external actions listed precisely.

### Task 8: Staging Deployment and Health Gate

**Dependencies:** Tasks 4, 5 and 7 complete; Task 3 may remain remote-pending but must be documented.

**Files:**
- Modify: `security-staging-report.md`, `security-deep-readiness.md`

**Steps:**

- [ ] Run local lint, typecheck, focused security tests and build immediately before deployment.
- [ ] Deploy only the current branch to the separate staging project using official CLI/API and staging variables.
- [ ] Verify startup, health, auth availability, DB connectivity, private Blob API path and Upstash connectivity with normal requests only.
- [ ] Verify the hostname is not production and that outbound integrations are sandboxed/mock/disabled.
- [ ] Record deployment ID, commit SHA and health evidence without tokens or PHI.
- [ ] Commit only deployment documentation as `infra: prepare security staging deployment`.

Expected result: `STAGING DEPLOYMENT: READY` only after isolation and health checks are evidenced.

### Task 9: Controlled Authorization and Middleware Validation

**Dependencies:** Tasks 5, 6 and 8 complete.

**Files:**
- Modify: `security-staging-report.md`, `security-deep-readiness.md`, `security-test-matrix.md`
- Add tests only if a real gap is found: existing focused security test locations

**Steps:**

- [ ] Execute normal login and expected-deny requests with synthetic identities only.
- [ ] Validate same-owner allow, cross-user deny, cross-role deny, disabled-session deny, stale-session deny and clinical-file deny.
- [ ] Validate direct API/server route authorization independently of UI navigation.
- [ ] Do not run payload fuzzing, brute force, load, DAST or exploit chains.
- [ ] Record status code class, technical test ID and result, never patient content or credentials.
- [ ] If a real regression is found, stop the validation, use systematic debugging, fix in a scoped commit and repeat all affected tests.
- [ ] Commit evidence/tests as `test: validate staging authorization boundaries`.

Expected result: authorization and middleware validation `PASS` for the documented matrix.

### Task 10: Final Verification, Review and Readiness Decision

**Dependencies:** Tasks 1-9.

**Files:**
- Modify: `security-deep-readiness.md`, `security-staging-report.md`
- Preserve unchanged: `security-report.md`

**Steps:**

- [ ] Run fresh local lint, typecheck, build, focused security regression tests, Semgrep, Gitleaks, OSV Scanner, pnpm audit, Trivy, Checkov, Syft and Grype.
- [ ] Read every command exit code and summarize correlated results; do not count generated audit artifacts as application findings.
- [ ] Confirm CodeQL status from the actual GitHub run, not workflow appearance.
- [ ] Confirm storage acceptance criteria, staging isolation, synthetic identities, RBAC matrix and controlled authorization results.
- [ ] Run `git diff --check`, `git status --short --branch`, inspect the commit list and verify no secrets or production artifacts were added.
- [ ] Perform a final code/document review using `requesting-code-review` if a review-capable subagent becomes available; otherwise perform a read-only diff review and record the capability limitation.
- [ ] Calculate readiness from evidence. Do not raise the score to meet the target; if any minimum criterion is missing, report `NOT READY` with only concrete blockers.
- [ ] If all minimum criteria pass, create `docs/plans/security-deep-audit.md` only; do not execute the Deep audit.
- [ ] Commit final evidence as `docs: record security staging readiness`.

Expected result: `READY` only when all acceptance criteria are externally evidenced; otherwise a precise blocker list.

## Verification Matrix

| Claim | Fresh evidence required |
|---|---|
| Local quality passes | Lint, typecheck, build and focused tests with exit 0 |
| Private Blob verified | Provider setting plus anonymous/authorized/unauthorized staging behavior |
| CodeQL passes | Completed GitHub Actions run and uploaded result |
| Staging isolated | Separate project, URL, DB, Blob, Upstash and secrets evidence |
| Identities ready | Synthetic role users login successfully in staging |
| Authorization passes | Matrix cases with expected allow/deny results |
| READY | All minimum criteria plus no unresolved external blocker |

## Rollback Strategy

- Revert only the specific commit that introduced a defect; do not reset or discard unrelated work.
- Stop deployment if hostname, environment variables or provider IDs resolve to production.
- Roll back staging deployment to the prior staging version.
- Restore only staging database snapshots and staging Blob objects.
- Never delete or migrate production objects as part of this plan.
