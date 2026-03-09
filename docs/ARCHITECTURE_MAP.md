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
