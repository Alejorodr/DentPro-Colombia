# Architecture Map — DentPro Colombia

## 1) Mapa de rutas

### Marketing / público
- `/` landing de marketing y CTA a autenticación/reserva.
- `/auth/login` ruta canónica de login (`/login` se mantiene solo como alias con redirect).
- `/appointments/new` inicio de flujo de creación de turno (requiere sesión).

### Auth
- `/auth/login`
- `/auth/forgot-password`
- `/auth/reset-password`

### Portales por rol
- `/portal/client/**` (PACIENTE)
- `/portal/professional/**` (PROFESIONAL)
- `/portal/receptionist/**` (RECEPCIONISTA)
- `/portal/admin/**` (ADMINISTRADOR)
- `/portal/[role]` resuelve redirecciones de dashboard por rol.

### APIs por dominio
- `app/api/auth/**`: login NextAuth + forgot/reset password.
- `app/api/appointments/**`: creación, edición, reprogramación, ICS.
- `app/api/client/**`: dashboard, citas y exportación de datos del paciente.
- `app/api/professional/**` y `app/api/professionals/**`: agenda, perfil, slots, adjuntos y dashboard profesional.
- `app/api/clinical/**`: episodios clínicos, notas, recetas, adjuntos y descarga segura.
- `app/api/admin/**`, `app/api/users/**`, `app/api/services/**`, `app/api/specialties/**`: administración de catálogo y usuarios.
- `app/api/analytics/**`: KPIs para admin/recepción.
- `app/api/ops/**`, `app/api/test/**`, `app/api/cron/**`: operación, testing controlado y jobs.

## 2) Diagrama textual de módulos

- **UI (App Router + components/hooks)**
  - `app/**/page.tsx`, `app/layout.tsx`, `components/**`, `hooks/**`.
  - Ownership sugerido: Frontend (experiencia de portal por rol + marketing).
- **API (Route Handlers)**
  - `app/api/**/route.ts`.
  - Ownership sugerido: Full-stack por dominio (appointments, clinical, admin).
- **DB/Prisma**
  - `prisma/schema.prisma`, `prisma/migrations/**`, `lib/prisma.ts`, seeds.
  - Ownership sugerido: Backend/Data.
- **Auth**
  - `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth/**`, `types/next-auth.d.ts`.
  - Ownership sugerido: Security/Platform.
- **Middleware/Proxy**
  - `proxy.ts` para control de acceso, redirects y request-id.
  - Ownership sugerido: Security/Platform.
- **Jobs/Cron**
  - `app/api/cron/appointments/reminders/route.ts`.
  - Ownership sugerido: Backend + Operaciones.

## 3) Flujos críticos

1. **Login**
   - Usuario entra en `/auth/login`.
   - `CredentialsProvider` valida credenciales en `auth.ts`.
   - JWT/session añade `role`, ids de perfil y default dashboard.
   - `proxy.ts` redirige al dashboard correspondiente y bloquea rutas de otro rol.

2. **Crear turno**
   - UI en `/appointments/new` o portal del paciente.
   - API principal: `POST /api/appointments`.
   - Se valida rol/sesión y disponibilidad (slots, profesional, servicio).
   - Persistencia via Prisma en tablas de citas + efectos de notificación.

3. **Reprogramar / cancelar turno**
   - API: `POST /api/appointments/[id]/reschedule` y/o update en `appointments/[id]`.
   - Reglas por rol: paciente/profesional/recepción/admin según endpoint.
   - Recalcula estado de slots y dispara comunicaciones (email/notificaciones).

4. **Clínica (episodios/adjuntos)**
   - APIs `app/api/clinical/**` + `app/api/professional/appointment/**`.
   - Profesional crea/edita episodios, notas y recetas.
   - Adjuntos se almacenan en Blob, metadata en Prisma y download con autorización.

5. **Admin (usuarios/servicios)**
   - APIs `app/api/users/**`, `app/api/services/**`, `app/api/specialties/**`, `app/api/admin/**`.
   - Control de acceso con sesión/rol ADMINISTRADOR.
   - Permite CRUD de catálogo, usuarios y consultas de auditoría/analytics.

## 4) Puntos de entrada

### App Router (page/layout)
- `app/layout.tsx`, `app/page.tsx`, `app/error.tsx`, `app/global-error.tsx`.
- Portales: `app/portal/**/page.tsx` (client/professional/receptionist/admin + `app/portal/[role]/page.tsx`).
- Auth: `app/auth/**/page.tsx` y `app/(marketing)/login/page.tsx`.
- Flujo de turnos: `app/appointments/new/page.tsx`.

### API routes
- Todos los handlers en `app/api/**/route.ts`.
- Endpoints sensibles/operativos: `app/api/ops/**`, `app/api/test/**`, `app/api/cron/**`.

### Middleware / proxy
- `proxy.ts` (matcher para `/portal/:path*`, `/auth/login`, `/login`, `/api/:path*`).


## 5) Inventario de APIs y rol requerido (resumen operativo)

> Nota: los roles se deducen de guards (`requireRole`, `isAuthorized`, validaciones de sesión) y segmentación por dominio.

### Auth / público
- `GET|POST /api/auth/[...nextauth]`: público (NextAuth gestiona sesión/cookies).
- `POST /api/auth/forgot-password`: público con rate limit.
- `POST /api/auth/reset-password`: público con token válido.

### Cliente (PACIENTE)
- `GET|POST /api/client/appointments`: PACIENTE.
- `GET|POST /api/client/consents`: PACIENTE.
- `GET /api/client/dashboard`: PACIENTE.
- `GET /api/client/data-export`: PACIENTE.

### Citas transversales
- `GET|POST /api/appointments`: ADMINISTRADOR / RECEPCIONISTA / PACIENTE (según operación).
- `GET|PATCH|DELETE /api/appointments/[id]`: ADMINISTRADOR / RECEPCIONISTA / PACIENTE / PROFESIONAL (según operación).
- `GET /api/appointments/[id]/calendar.ics`: sesión válida del actor autorizado sobre la cita.
- `POST /api/appointments/[id]/reschedule`: actor autorizado sobre la cita (PACIENTE o staff según reglas).

### Profesionales
- `GET|POST /api/professionals`: ADMINISTRADOR (gestión).
- `GET|PATCH /api/professionals/[id]`: ADMINISTRADOR.
- `GET /api/professionals/[id]/slots`: autenticado (consulta disponibilidad).
- `POST /api/professionals/[id]/slots/generate`: ADMINISTRADOR / RECEPCIONISTA.
- `GET|PUT /api/professional/profile`: PROFESIONAL.
- `GET|PUT /api/professional/preferences`: PROFESIONAL.
- `GET|POST /api/professional/availability`: PROFESIONAL.
- `GET /api/professional/dashboard`: PROFESIONAL.
- `GET /api/professional/patients`: PROFESIONAL.
- `GET|POST /api/professional/attachments`: PROFESIONAL.
- `GET|POST /api/professional/appointment/[id]/notes`: PROFESIONAL.
- `GET|POST /api/professional/appointment/[id]/attachments`: PROFESIONAL.
- `GET|POST /api/professional/appointment/[id]/prescription`: PROFESIONAL.

### Clínica
- `GET|POST /api/clinical/patients/[patientId]/episodes`: PROFESIONAL (y staff autorizado según contexto).
- `GET|PATCH /api/clinical/episodes/[episodeId]`: PROFESIONAL.
- `GET|POST /api/clinical/episodes/[episodeId]/notes`: PROFESIONAL.
- `GET|POST /api/clinical/episodes/[episodeId]/prescriptions`: PROFESIONAL.
- `GET|POST /api/clinical/episodes/[episodeId]/attachments`: PROFESIONAL.
- `GET /api/clinical/attachments/[attachmentId]/download`: usuario autenticado con acceso al paciente/episodio.
- `DELETE /api/clinical/attachments/[attachmentId]`: PROFESIONAL (o actor autorizado por política clínica).

### Administración / catálogo
- `GET|POST /api/users`: ADMINISTRADOR.
- `PATCH|DELETE /api/users/[id]`: ADMINISTRADOR.
- `GET|PATCH /api/users/me`: autenticado.
- `GET|PATCH /api/users/me/notifications`: autenticado.
- `GET|POST /api/services`: ADMINISTRADOR.
- `PATCH|DELETE /api/services/[id]`: ADMINISTRADOR.
- `GET|POST /api/specialties`: ADMINISTRADOR.
- `PATCH|DELETE /api/specialties/[id]`: ADMINISTRADOR.
- `GET|POST /api/admin/templates`: ADMINISTRADOR.
- `GET|PATCH|DELETE /api/admin/templates/[id]`: ADMINISTRADOR.
- `GET /api/admin/audit/access-logs`: ADMINISTRADOR.
- `GET /api/admin/patients/[id]/export`: ADMINISTRADOR.
- `GET|POST /api/admin/holidays`: ADMINISTRADOR.

### Recepción / analytics
- `GET /api/analytics/receptionist`: RECEPCIONISTA / ADMINISTRADOR.
- `GET /api/analytics/receptionist/calendar`: RECEPCIONISTA / ADMINISTRADOR.
- `GET /api/analytics/admin`: ADMINISTRADOR.
- `GET /api/search`: RECEPCIONISTA / ADMINISTRADOR.
- `GET|POST /api/patients`: RECEPCIONISTA / ADMINISTRADOR.
- `GET|PATCH /api/patients/[id]`: RECEPCIONISTA / ADMINISTRADOR.

### Campañas / notificaciones
- `GET|POST /api/campaigns`: ADMINISTRADOR.
- `GET|PATCH|DELETE /api/campaigns/[id]`: ADMINISTRADOR.
- `GET|POST /api/notifications`: autenticado (scope por rol/usuario).
- `PATCH|DELETE /api/notifications/[id]`: autenticado sobre recurso propio o staff.

### Ops / test / monitoreo
- `GET /api/monitoring`: interno/observabilidad.
- `POST /api/cron/appointments/reminders`: cron protegido por secreto.
- `GET /api/ops/auth-diagnostics`: protegido con `OPS_KEY`, allowlist IP y rate limit.
- `POST /api/ops/seed-admin`: solo `development` + no Vercel/prod + `OPS_KEY`.
- Allowlist IP de ops (`OPS_IP_ALLOWLIST`, lista separada por comas): en producción (`NODE_ENV=production` o `VERCEL_ENV=production`) una allowlist vacía **deniega** (fail-closed), salvo E2E local/CI con `RUN_E2E=1` fuera de Vercel. En development/test una allowlist vacía permite. En Vercel la IP se toma de `x-vercel-forwarded-for` / `x-real-ip`; en self-hosting la app debe ir detrás de un proxy que sobrescriba `x-real-ip`/`x-forwarded-for`.
- `/api/ops/migrate` fue eliminado (H4, 2026-11-21): las migraciones se aplican con `prisma migrate deploy` desde CI o localmente, nunca vía endpoint HTTP.
- `POST /api/test/seed`: solo `test` y 404 en producción.

## 6) Inventario adicional de infraestructura

- **Auth runtime**: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth/**`, `types/next-auth.d.ts`.
- **DB y acceso**: `prisma/schema.prisma`, `prisma/migrations/**`, `lib/prisma.ts`, `prisma/seed.ts`.
- **Proxy/middleware**: `proxy.ts` (gating de `/portal/**`, login y APIs).
- **Jobs/Cron**: `app/api/cron/appointments/reminders/route.ts`.
- **Tests**: `tests/**` (Vitest unit/integration) y `e2e/**` (Playwright smoke/flujo).

## 7) Responsables por módulo

> Áreas responsables, no personas: son las mismas del diagrama de módulos (sección 2). Cuando haya un equipo, asigna una persona por área. La columna de tests indica dónde mirar antes de tocar el módulo.

| Módulo | Área responsable | Archivos clave | Tests que lo cubren |
|---|---|---|---|
| Autenticación y sesión | Security/Platform | `auth.ts`, `lib/auth/**`, `proxy.ts`, `app/api/auth/**` | `tests/auth*`, `tests/credentials*`, `tests/forgot-password-timing*`, `tests/rate-limit-*`, `lib/auth/__tests__`, `e2e/auth.spec.ts`, `e2e/password-reset.spec.ts` |
| Autorización por rol | Security/Platform | `lib/authz.ts`, `app/api/_utils/auth.ts`, `lib/auth/require-role.ts` | `tests/api-role-contracts.test.ts` (matriz por rol), `tests/roles*`, `tests/api.*authz*`, `e2e/role-portal-smoke.spec.ts` |
| Seguridad transversal | Security/Platform | `lib/security/**` (CSP, cifrado de campos, JSON-LD), `scripts/scan-secrets.mjs` | `lib/security/__tests__`, `tests/ops-hardening*`, `tests/ops-ip-allowlist*`, `tests/e2e-auth-bypass-guard*` |
| Citas y agenda | Full-stack (appointments) | `app/api/appointments/**`, `app/api/client/appointments/**`, `lib/appointments/**`, `lib/scheduling/**` | `tests/appointment*`, `tests/appointments-reschedule*`, `tests/booking-limits*`, `tests/release-cancelled-slots*`, `tests/slot-inventory-refresh*`, `tests/public-slots-contract*`, `tests/schedules-scope*`, `e2e/public-booking-flow.spec.ts`, `e2e/client-portal.spec.ts` |
| Clínica (episodios, notas, recetas, adjuntos) | Full-stack (clinical) | `app/api/clinical/**`, `app/api/professional/appointment/**`, `lib/clinical/**` | `tests/clinical-*`, `tests/attachments*`, `e2e/clinical-role-flows.spec.ts` |
| Administración y catálogo | Full-stack (admin) | `app/api/users/**`, `app/api/services/**`, `app/api/specialties/**`, `app/api/admin/**`, `app/portal/admin/**` | `tests/admin-*`, `tests/audit-log*`, `app/api/admin/homepage/_lib.test.ts`, `app/api/services/route.test.ts` |
| Marketing y contenido del home | Frontend | `app/page.tsx`, `app/(marketing)/**`, `app/servicios/**`, `lib/marketing/**` | `lib/marketing/__tests__`, `tests/admin-homepage-*`, `e2e/marketing-home.spec.ts`, `e2e/smoke-home-no-blank.spec.ts` |
| Caché de catálogos | Backend/Data | `lib/cache/catalog.ts`, invalidación en `lib/prisma.ts` | `lib/cache/__tests__`, `e2e/catalog-cache.spec.ts` |
| Analytics y recepción | Full-stack (analytics) | `app/api/analytics/**`, `lib/analytics/**`, `app/portal/receptionist/**` | `tests/analytics-*`, `tests/receptionist-*`, `tests/activity-feed*`, `e2e/admin-analytics.spec.ts`, `e2e/receptionist-activity-smoke.spec.ts` |
| Base de datos | Backend/Data | `prisma/schema.prisma`, `prisma/migrations/**`, `lib/prisma.ts`, `lib/db/**` | `tests/prisma-client*`, `tests/dentpro-prisma-adapter*`, `tests/vercel-prisma*`, `lib/db/__tests__` |
| Correo y notificaciones | Backend + Operaciones | `lib/email.ts`, `lib/email/**` (cola de salida), `lib/notifications/**` | `lib/email/__tests__`, `tests/appointment-email*` |
| Jobs y cron | Backend + Operaciones | `app/api/cron/**`, `vercel.json` | `tests/cron-*` |
| Observabilidad y operación | Security/Platform | `lib/logger.ts`, `lib/monitoring/**`, `app/api/monitoring/**`, `app/api/ops/**` | `tests/monitoring-route*`, `lib/monitoring/__tests__` |
| CI/CD y releases | Security/Platform | `.github/workflows/**`, `.changeset/**`, `scripts/e2e-local.mjs`, `scripts/run-e2e.mjs` | Workflows `ci.yml`, `e2e-smoke.yml`, `e2e-nightly.yml`, `secret-scan.yml`, `codeql.yml` |
