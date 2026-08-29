# DentPro Security Test Matrix

Date: 2026-08-29  
Status: `READY FOR ISOLATED STAGING`, users not provisioned locally.

DentPro defines these roles in the application: `PACIENTE`, `PROFESIONAL`, `RECEPCIONISTA` and `ADMINISTRADOR`. The Prisma schema has no clinic, organization or tenant entity, so cross-tenant cases are not applicable to the current data model. Ownership and professional-patient relationship cases remain applicable.

## Test Users

| Test User | Role | Tenant/Clinic | Purpose | Provisioning |
|---|---|---|---|---|
| `sec-patient-a` | PACIENTE | Not modeled | Own records and own attachments | External action required in isolated staging |
| `sec-patient-b` | PACIENTE | Not modeled | Horizontal isolation from patient A | External action required in isolated staging |
| `sec-professional-a` | PROFESIONAL | Not modeled | Clinical relationship and professional operations | External action required in isolated staging |
| `sec-professional-b` | PROFESIONAL | Not modeled | Wrong-professional denial | External action required in isolated staging |
| `sec-receptionist` | RECEPCIONISTA | Not modeled | Operational least privilege | External action required in isolated staging |
| `sec-admin` | ADMINISTRADOR | Not modeled | Administrative controls and role changes | External action required in isolated staging |
| `sec-disabled` | Any role | Not modeled | Existing-session invalidation | Provision, then disable only in staging |

No test users were created because no isolated staging database is configured and no production data may be touched.

## Authorization Matrix

This is the test authority for controlled staging validation. `Deny` means the server must reject the operation; UI visibility is not evidence of authorization.

| Resource | Action | PACIENTE | PROFESIONAL | RECEPCIONISTA | ADMINISTRADOR | Expected |
|---|---|---:|---:|---:|---:|---|
| Own profile | READ/UPDATE | Allow | Allow | Allow | Allow | Own user only |
| Other users | READ/UPDATE/DELETE | Deny | Deny | Deny | Allow | Admin server-side check |
| Patients | READ | Own | Related | Operational | Allow | Relationship/role required |
| Patients | CREATE/UPDATE/DELETE | Deny | Related clinical flow | Operational flow | Allow | Server-side role and ownership |
| Appointments | CREATE | Own booking | Professional flow | Operational flow | Allow | Valid workflow and ownership |
| Appointments | READ | Own | Assigned/related | Operational | Allow | No ID substitution bypass |
| Appointments | UPDATE/DELETE | Own limited flow | Assigned/related | Operational | Allow | State transition checks |
| Schedules/slots | READ | Public booking data only | Own/authorized | Operational | Allow | No broad enumeration |
| Clinical episodes/notes | READ | Own visible data | Related patient | Deny unless explicit route allows | Allow | Clinical relationship |
| Clinical episodes/notes | CREATE/UPDATE/DELETE | Deny | Related patient | Deny | Allow | Clinical role and audit |
| Clinical attachments | READ/DOWNLOAD | Own visible | Related patient | Deny unless explicit route allows | Allow | Authorization before storage access |
| Clinical attachments | CREATE/DELETE | Deny | Related patient | Deny | Allow | Server-side relationship |
| Prescriptions/allergies | READ | Own | Related patient | Deny unless explicit route allows | Allow | No cross-patient access |
| Services/specialties | READ | Public catalog | Allow | Allow | Allow | Public projection only |
| Services/specialties | CREATE/UPDATE/DELETE | Deny | Deny | Deny | Allow | Admin only |
| Templates/consents | READ | Assigned consent | Deny | Deny | Allow | Stored HTML sanitizer remains required |
| Templates/consents | CREATE/UPDATE/DELETE | Deny | Deny | Deny | Allow | Admin only |
| Audit/access logs | READ | Deny | Deny | Deny | Allow | No PHI leakage to lower roles |
| Settings/roles | READ/UPDATE | Deny | Own settings | Own settings | Allow | Role changes invalidate sessions |

## Controlled Cases

- `AUTH-H-01`: patient A reads patient B resource: expected `403` or indistinguishable `404`.
- `AUTH-H-02`: professional A accesses professional B patient relationship: expected denial.
- `AUTH-V-01`: patient or receptionist calls an admin mutation directly: expected `403`.
- `AUTH-S-01`: role downgrade invalidates the old session before an admin operation.
- `AUTH-S-02`: disabled user cannot use an existing session.
- `FILE-01`: authorized clinical relationship downloads; anonymous and unrelated users are denied.
- `FILE-02`: path/ID substitution does not change the authorization result.
- `MIDDLEWARE-01`: direct API request and server-rendered route enforce server authorization independently of UI.
