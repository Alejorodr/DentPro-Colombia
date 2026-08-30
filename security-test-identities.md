# DentPro Security Test Identities

Date: 2026-08-30
Status: `READY FOR ISOLATED STAGING`; identities are not provisioned.

## Safety Boundary

These identities are a test design only. They must be created exclusively in a dedicated Security Staging environment with fictional data. No production account, credential, email address or clinical record may be reused.

The current Prisma schema defines no clinic, organization or tenant entity. Cross-tenant cases are therefore not applicable to this repository version; cross-user ownership and professional-patient relationship cases remain required.

## Identity Matrix

| Technical identity | Role | Environment | Purpose | State | Provisioning |
|---|---|---|---|---|---|
| `sec-patient-a` | `PACIENTE` | Security Staging | Own-record and own-attachment positive path | Active | External action required |
| `sec-patient-b` | `PACIENTE` | Security Staging | Horizontal isolation from patient A | Active | External action required |
| `sec-professional-a` | `PROFESIONAL` | Security Staging | Authorized clinical relationship | Active | External action required |
| `sec-professional-b` | `PROFESIONAL` | Security Staging | Wrong-professional denial | Active | External action required |
| `sec-receptionist` | `RECEPCIONISTA` | Security Staging | Operational least privilege | Active | External action required |
| `sec-admin` | `ADMINISTRADOR` | Security Staging | Administrative controls and controlled role changes | Active | External action required |
| `sec-disabled` | Role assigned in staging | Security Staging | Existing-session invalidation after disablement | Disabled during test | External action required |

## Required State Transitions

| Case | Starting identity | Controlled transition | Expected result |
|---|---|---|---|
| Stale role | `sec-admin` | Downgrade role in staging after login | Previous session denied for admin-only operation |
| Disabled session | `sec-patient-a` or `sec-professional-a` | Disable account after login | Existing session denied for protected operation |
| Password/session revocation | Any active identity | Change password where supported | Previous session invalidated according to policy |
| Ownership isolation | `sec-patient-a` | Request resource owned by `sec-patient-b` | Denied with `403` or indistinguishable `404` |
| Professional isolation | `sec-professional-a` | Request patient relationship owned by `sec-professional-b` | Denied server-side |
| Vertical isolation | `sec-patient-a` / `sec-receptionist` | Request administrator-only mutation directly | Denied server-side |

## Synthetic Data Requirements

- Use fictional names, identifiers, dates and clinical values.
- Use non-deliverable addresses such as `sec-patient-a@staging.invalid` if the authentication flow requires email-shaped identifiers.
- Use staging-only passwords generated through the provider or local secret mechanism; never record them in this file, logs or commits.
- Create only records represented by the current schema and needed by the authorization matrix.
- Create at least two unrelated patient records and two professional relationships for ownership checks.
- Do not send real email, SMS or WhatsApp messages and do not call production webhooks.

## Provisioning Acceptance Criteria

The identities become `READY` only after evidence shows:

1. All four real roles have an active staging identity.
2. Patient and professional isolation fixtures exist with synthetic data.
3. A disabled identity can be used to verify existing-session rejection.
4. Role-change and password/session-revocation transitions are executable in staging.
5. No identity or credential belongs to production.

Current result: `NOT PROVISIONED - EXTERNAL ACTION REQUIRED`.
