# Security Re-test Report

Date: 2026-08-29  
Repository: DentPro-Colombia  
Branch: `security/remediation-standard-audit`  
Scope: local repository, local tests and static analysis only. No production, public endpoint, DAST, ZAP Active Scan, Nuclei, brute force, fuzzing, load testing or destructive action was performed.

## 1. Executive Summary

The P1/P2 remediation scope reduced the original confirmed high-risk exposure in application code. Session authorization now resolves current account state server-side, clinical attachment downloads require authorization and stream from private Blob storage, HTML sinks use an allowlist sanitizer, rate limiting no longer fails open, and GitHub Actions are pinned to verified release SHAs with explicit permissions.

The application build, lint, typecheck and focused security regression suite pass. The full filtered Vitest runner was also attempted, but the post-remediation run terminated before test discovery with Windows native exit code `-1073741819`; no assertion failure or stack trace was produced. The baseline full filtered suite had passed 76 files / 257 tests. This runner limitation remains open evidence, not a claim of a failing application test.

**Security Posture Score: 86/100**

| Metric | Result |
|---|---:|
| Critical | 0 |
| High | 0 |
| Medium | 0 open from the original set |
| Low | 2 open/inherited |
| Info | 3 |
| Confirmed vulnerabilities after remediation | 0 |
| Potential/probable residual findings | 2 |
| False positives discarded | 0 original findings discarded; scanner noise was correlated separately |

### Top 5 Residual Risks

1. Existing clinical Blob objects require migration/re-upload and the production Blob store must be verified private.
2. CodeQL database creation remains incomplete in this Windows local environment.
3. Legacy professional attachment references can still accept arbitrary external/data URLs and need a separate design decision.
4. The monitoring diagnostic route remains publicly reachable under its existing low-severity finding.
5. Broad authenticated schedule responses should receive a later least-privilege review even though anonymous enumeration is blocked.

## 2. Original Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| SEC-001 | HIGH | Stale JWT/session state after role or account changes | FIXED in server-side session resolution |
| SEC-002 | HIGH | Clinical attachments stored/publicly redirected through Blob URLs | MITIGATED; private store and existing-object migration remain deployment prerequisites |
| SEC-003 | MEDIUM | Incomplete HTML sanitization before `dangerouslySetInnerHTML` | FIXED for identified stored-template sinks |
| SEC-004 | MEDIUM | Rate limiting fail-open when Upstash is absent or fails | FIXED with conservative in-memory fallback |
| SEC-005 | MEDIUM | Mutable GitHub Actions tags and implicit permissions | FIXED for identified workflow findings |
| SEC-006 | MEDIUM | Public schedule enumeration | FIXED for anonymous access; authenticated response minimization remains residual hardening |
| SEC-007 | MEDIUM | Registration abuse and duplicate-account enumeration | FIXED with endpoint throttling and uniform success-shaped duplicate response |
| SEC-008 | LOW | Public `/_monitoring?error=1` diagnostic surface | OPEN, not changed in this remediation scope |
| SEC-009 | LOW | Legacy professional attachment external/data URL handling | OPEN, requires separate compatibility/design review |
| INFO | INFO | Development tooling signals, package age and absent Docker/IaC | INFORMATIONAL |

## 3. Changes Performed

| Finding | Main files | Change | Tests |
|---|---|---|---|
| SEC-001 | `auth.ts`, `lib/auth/session.ts`, `app/api/users/[id]/route.ts` | Resolve JWT identity, status, role and password-change invalidation against current DB state | Session, user guard and auth tests |
| SEC-002 | `lib/clinical/attachments.ts`, clinical download route | Private upload, server authorization, private Blob stream, no-store/no-sniff response | Ownership, anonymous, signed/private download tests |
| SEC-003 | `lib/security/sanitize-html.ts`, `package.json` | Replace regex sanitization with `sanitize-html` allowlist and safe URL schemes | Stored XSS payload regression tests |
| SEC-004 | `app/api/_utils/ratelimit.ts`, `proxy.ts` | Conservative local fallback for missing/erroring Upstash, warning without secrets | Missing-provider, provider-error and middleware tests |
| SEC-005 | `.github/workflows/*.yml` | Full verified SHAs and least-privilege CI/E2E permissions | Checkov and workflow Semgrep re-scans |
| SEC-006 | schedules route/page | Server-side session required; internal page request forwards cookie | Anonymous denial and authenticated response tests |
| SEC-007 | registration route | Endpoint-specific rate limit and duplicate-response normalization | Registration rate-limit test |

## 4. Commits

- `7dec97a security: harden session and token revocation`
- `3c56cda security: protect clinical attachments`
- `2bb5940 security: harden html rendering and sanitization`
- `050826d security: harden rate limiting fallback`
- `600f2dc security: harden github actions supply chain`
- `fe0cef1 security: restrict public schedule and registration`
- `85c0169 security: clean up registration remediation`
- `8bbe248 test: add security regression coverage`

## 5. Tests and Build

- Baseline: 76 files / 257 tests passed; lint, typecheck and build passed.
- Focused security regression re-test: **9 files / 29 tests passed**.
- Lint: **PASS**.
- Typecheck: **PASS**.
- Build: **PASS**, Next.js 16.3.0, 130 static pages generated.
- Full filtered Vitest re-test: runner terminated before discovery with Windows native exit `-1073741819`; no test assertion failure was emitted. The baseline full filtered run passed and the focused post-remediation set passed.

## 6. Scanner Results

### Semgrep

Project re-scan: 10 review signals remain. They cover minimum npm release age, two reviewed HTML sinks, a dynamic E2E regexp, Ajv `allErrors`, and child-process/shell usage in local E2E/build helpers. Workflow-only re-scan: 0 findings. No new auth, attachment or rate-limit finding was reported.

### CodeQL

**INCOMPLETE.** CLI version 2.26.4 was available, but local JavaScript database creation repeatedly entered the autobuild wrapper and did not complete. No CodeQL result is claimed. This must be completed in CI or a controlled CodeQL runner before Deep Audit.

### Gitleaks

**PASS:** 0 leaks across 643 commits. No complete secrets are included in this report.

### OSV Scanner

**PASS:** lockfile scan reported 0 vulnerabilities.

### pnpm audit

**PASS:** 0 advisories at informational, low, moderate, high and critical severity.

### Syft / Grype

Syft generated a project SBOM with 1,030 components. Grype analysis of that SBOM reported 0 matches.

### Trivy

The broad scan included generated CodeQL/audit database fixtures and produced secret-pattern noise from example strings in those fixtures. Those paths are not application source. No repository secret was identified by Gitleaks; generated audit databases were excluded from project evidence.

### Checkov

GitHub Actions re-scan: **184 passed / 0 failed**. A metadata lookup timeout was observed during execution; it did not target external infrastructure and did not invalidate the local workflow result.

## 7. Before vs After

| Metric | Initial audit | After remediation |
|---|---:|---:|
| Critical | 0 | 0 |
| High | 2 | 0 |
| Medium | 5 | 0 open from original set |
| Low | 2 | 2 open |
| Info | 3 | 3 |
| Confirmed | 2 | 0 open |
| Likely/Possible | 7 | 2 residual low findings |
| SAST | Partial, auth/storage sinks present | Semgrep re-scan completed; CodeQL incomplete |
| SCA | Available | OSV/pnpm/Grype clean |
| Secrets | Available | Gitleaks clean; Trivy artifacts correlated |
| Auth/AuthZ | High-risk stale state and public schedule route | Server-side current-state checks and authenticated schedule route |
| Supply chain | Mutable workflow tags | Full SHA pinning and explicit permissions |

## 8. Residual Risk

- SEC-002 is application-level mitigated, but private Blob storage must be confirmed in the deployment and previously public clinical objects must not remain publicly readable.
- Middleware can still use token claims for routing; protected server handlers perform current-state checks. A staging validation should confirm all sensitive pages and APIs enforce the same policy.
- Upstash remains the distributed limiter; the fallback prevents fail-open behavior but is process-local.
- SEC-006 authenticated schedule output is broader than ideal and needs a later least-privilege review.
- SEC-008 and SEC-009 remain open.
- DAST, staging behavior, cloud IAM and external-service configuration were intentionally not tested.

## 9. Recommendations

1. Verify the Vercel Blob store is private and migrate/re-upload existing clinical objects before release.
2. Complete CodeQL in CI with an explicit supported JavaScript/TypeScript build configuration.
3. Resolve or formally accept SEC-008 and SEC-009.
4. Add isolated staging accounts for patient, professional, receptionist and administrator roles before any authorized DAST.
5. Keep the workflow SHA update process documented so dependency updates do not reintroduce mutable refs.

## 10. Deep Audit Readiness

**DEEP AUDIT READINESS: 74/100 — NOT READY**

Blockers and prerequisites:

- Complete CodeQL database creation and query execution.
- Verify private Blob configuration and migrate existing clinical objects.
- Provide isolated staging with non-production data and explicit written DAST scope.
- Provide test accounts for all roles and ownership/tenant combinations.
- Mock or isolate Resend, Sentry, Upstash, Vercel Blob, OAuth and other external services.
- Define rollback and data-preservation procedures before active testing.

Recommended Deep scope: authorization matrix and cross-patient access, clinical file lifecycle, business workflows, API resource-consumption controls, CI/CD supply chain, cloud/IAM configuration, and AI/MCP review if those components are enabled.
