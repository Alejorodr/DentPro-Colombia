# Architecture Map — DentPro Colombia

## 1) Mapa de rutas

### Marketing / público
- `/` landing de marketing y CTA a autenticación/reserva.
- `/login` alias de login.
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
- `GET /api/admin/metrics/appointments`: ADMINISTRADOR.
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
- `GET /api/_monitoring`: interno/observabilidad.
- `POST /api/cron/appointments/reminders`: cron protegido por secreto.
- `GET /api/ops/auth-diagnostics`: protegido con `OPS_KEY`, allowlist IP y rate limit.
- `POST /api/ops/migrate`: solo `development` + `OPS_KEY` + allowlist + rate limit.
- `POST /api/ops/seed-admin`: solo `development` + no Vercel/prod + `OPS_KEY`.
- `POST /api/test/seed`: solo `test` y 404 en producción.

## 6) Inventario adicional de infraestructura

- **Auth runtime**: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth/**`, `types/next-auth.d.ts`.
- **DB y acceso**: `prisma/schema.prisma`, `prisma/migrations/**`, `lib/prisma.ts`, `prisma/seed.ts`.
- **Proxy/middleware**: `proxy.ts` (gating de `/portal/**`, login y APIs).
- **Jobs/Cron**: `app/api/cron/appointments/reminders/route.ts`.
- **Tests**: `tests/**` (Vitest unit/integration) y `e2e/**` (Playwright smoke/flujo).
