# DentPro Security Staging Deep Readiness Design

**Date:** 2026-08-30  
**Branch:** `security/remediation-standard-audit`

## Goal

Prepare an isolated, synthetic-data security staging environment and collect evidence required to move DentPro toward Deep Audit readiness without touching production or running active attack tooling.

## Context

DentPro is a Next.js 16 / React 19 application using Node 24, pnpm, PostgreSQL with Prisma, NextAuth JWT sessions, Vercel Blob, Upstash rate limiting, Sentry, email providers and Google integrations. The application has the roles `PACIENTE`, `PROFESIONAL`, `RECEPCIONISTA` and `ADMINISTRADOR`. The Prisma schema has no clinic/tenant entity.

The repository already contains application hardening for sessions, clinical attachments, HTML, rate limiting and workflows, plus a CodeQL workflow and a dry-run-first clinical Blob migration script. The remaining readiness questions are deployment and environment questions, not reasons to change application architecture blindly.

## Safety Boundary

- Production is read-only for strictly necessary configuration discovery; no production scan, write, migration, deletion, user creation or variable change is permitted.
- Security Staging must use a separate deployment, database, Blob store, Upstash namespace/database and secrets.
- Only fictional records may be used.
- DAST, ZAP Active Scan, Nuclei, fuzzing, brute force, DoS, load testing and exploitation remain disabled.
- No credential values may enter source, Markdown, logs, commits or screenshots.

## Architecture

The staging topology is:

`Git branch -> separate Vercel project/deployment -> staging env vars -> isolated PostgreSQL -> Prisma schema/migrations -> synthetic seed -> isolated private Blob + isolated Upstash -> controlled functional security validation`

The production topology is never used as a data source for staging. Clinical Blob migration is allowed only against the isolated staging store and only after a dry-run identifies synthetic records; production migration is explicitly out of scope.

## Workstream Boundaries

| Workstream | Owns | May modify | Must not modify |
|---|---|---|---|
| A Vercel/staging | Project/environment discovery and isolated resource plan | Readiness docs | Production settings/resources |
| B Blob | Private-store evidence and staging dry-run | Blob migration tooling/docs | Production Blob objects |
| C Database | Isolated schema/migrations/seed design | Staging seed script if required | Production DB/data |
| D Identities | Role matrix and synthetic accounts | Identity docs/seed support | Production users |
| E Upstash | Isolated limiter validation plan | Readiness docs/config templates | Production Redis |
| F CodeQL | CI workflow and remote run evidence | `.github/workflows/codeql.yml` only if needed | Application architecture |
| G Integrations | Sandbox/mock/disabled inventory | Staging docs/config templates | Production integrations |
| H Deployment | Staging deployment and health checks | Deployment docs/config only | Production deployment |
| I/J Validation | Controlled authz/middleware checks | Test docs and local tests | Active attack tooling |

Because no subagent dispatch API is exposed in this session, the orchestrator will execute one workstream at a time where it can affect shared state, and will use isolated documentation/code scopes for independent work. No parallel writers will share a working tree.

## Decision

Use a hybrid approach: prepare all repository-local contracts and scripts first, then perform externally authenticated provisioning only when the user supplies or authorizes isolated staging resources. This is preferable to inventing Vercel/DB/Upstash state or using production credentials. CodeQL is configured in CI with `build-mode: none` for JavaScript/TypeScript and is accepted only after a real GitHub run.

## Acceptance Evidence

Readiness can become `READY` only when all of these have evidence:

1. Blob store private, anonymous direct access denied, authorized application access allowed, unauthorized user denied.
2. Legacy Blob dry-run completed in isolated staging; no production migration performed.
3. CodeQL GitHub run completed successfully.
4. Separate staging deployment, database, Blob, Upstash and secrets verified.
5. Synthetic users and records exist for every real role.
6. Authorization matrix is complete and controlled same-owner, cross-user, cross-role, disabled-session and file-denial tests pass.
7. Lint, typecheck, build and security regression tests pass.

## Rollback

Repository rollback is by reverting the specific commit, never by reset/force-push. Staging rollback uses provider version rollback and database restore from the staging-only snapshot. Blob migration is non-destructive until integrity, DB reference and authorization checks pass; production migration is not part of this design.
