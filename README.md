# DentPro Colombia

Sistema de gestión de turnos clínicos con Next.js App Router, Prisma y NextAuth (Credentials).

## Requisitos

- Node.js 20+
- Base de datos Postgres (Neon recomendado)
- Vercel Blob (adjuntos clínicos en producción)
- Upstash Redis (rate limiting global, recomendado)

## Configuración

1. Copia el archivo de entorno:

```bash
cp .env.example .env
```

2. Completa las variables obligatorias:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` (opcional en Vercel/Neon: usado para migraciones y diff)
- `SHADOW_DATABASE_URL` (opcional, recomendado: base shadow para validar drift con Prisma)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://dent-pro-colombia.vercel.app/`
- `AUTH_TRUST_HOST=true`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `RESEND_API_KEY` (producción)
- `EMAIL_FROM` (producción)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (emails de citas por SMTP)
- `NEXT_PUBLIC_APP_URL` (local)
- `UPSTASH_REDIS_REST_URL` (rate limiting persistente)
- `UPSTASH_REDIS_REST_TOKEN` (rate limiting persistente)
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob para adjuntos clínicos)
- `SENTRY_DSN` (observabilidad en server)
- `NEXT_PUBLIC_SENTRY_DSN` (observabilidad en client)
- `SENTRY_ENVIRONMENT` (opcional)
- `SENTRY_TRACES_SAMPLE_RATE` (opcional, default 0.1)
- `LOG_LEVEL` (opcional, default `info`)
- `CRON_SECRET` (opcional, protege el cron de recordatorios)

> Nota: `scripts/vercel-prisma.mjs` exige `DATABASE_URL` en deploys de Vercel para ejecutar `prisma migrate deploy`.

3. Genera el cliente Prisma y aplica migraciones:

```bash
npm run prisma generate
npx prisma migrate deploy
```

4. Ejecuta el seed:

```bash
npm run prisma:seed
```

### Credenciales demo (seed)

El seed crea usuarios de demostración para probar el portal recepcionista:

- Recepcionista: `demo-recepcion@dentpro.co` / `RecepDentPro!1`
- Profesionales: `demo-profesional@dentpro.co`, `demo-profesional2@dentpro.co`, `demo-profesional3@dentpro.co` / `DentProDemo!1`
- Pacientes: `demo-paciente@dentpro.co` y otros (`paciente.*@dentpro.co`) / `DentProDemo!1`

### Shadow database en Neon (recomendado)

Para que `scripts/vercel-prisma.mjs` pueda validar drift en Vercel, configura `SHADOW_DATABASE_URL` apuntando a una base vacía en el mismo proyecto de Neon (puede ser otro database). Luego agrega esa URL como variable de entorno en Vercel.

## Adjuntos clínicos (Blob storage)

Los adjuntos clínicos se almacenan en Vercel Blob y se referencian por `storageKey`. Por defecto, el tamaño máximo es **10MB** y los tipos permitidos son **PDF, JPG, PNG**.

- Si usas el plan free de Vercel Blob (límite 5MB por archivo), ajusta el límite o sube de plan para soportar 10MB.
- Mantén respaldos separados del storage de blobs (ver runbook de backups).


## Seed del admin (manual)

El seed garantiza que exista un usuario ADMINISTRADOR con el correo real (ej. `kevinrodr@hotmail.com`). Ejecuta el seed manualmente cuando quieras crear o actualizar la cuenta admin:

```bash
SEED_ADMIN_EMAIL=kevinrodr@hotmail.com SEED_ADMIN_PASSWORD="TuPasswordSegura" npm run prisma:seed
```

- Si el usuario existe, se asegura el rol `ADMINISTRADOR` y se actualiza la contraseña solo si `SEED_ADMIN_PASSWORD` está presente.
- Si no existe, `SEED_ADMIN_PASSWORD` es obligatorio para crearlo.
- El seed no se ejecuta automáticamente en deploys.

## Recuperación de contraseña

- URL pública: `/auth/forgot-password`
- Reset: `/auth/reset-password?token=...`

En desarrollo sin `RESEND_API_KEY`, el link de reset se muestra en consola **solo** con `NODE_ENV=development`.
En producción, configura Resend:

```bash
RESEND_API_KEY=tu_api_key
EMAIL_FROM="DentPro <no-reply@tu-dominio.com>"
NEXTAUTH_URL=https://dent-pro-colombia.vercel.app/
```

Para emails de citas (confirmaciones, recordatorios, reprogramaciones) configura SMTP con `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

### Flujo local rápido

1. Ejecuta el seed con tu correo.
2. Visita `/auth/forgot-password` e ingresa el correo.
3. Copia el link desde la consola (solo en desarrollo).
4. Define la nueva contraseña y vuelve a iniciar sesión.

## Scripts útiles

- `npm run dev`: entorno local (Turbopack)
- `npm run build`: build de producción
- `npm run lint`: lint
- `npm run test`: tests unitarios
- `npm run test:e2e`: E2E (opt-in, requiere browsers instalados)

### Playwright (E2E)

Para instalar los browsers (una sola vez) ejecuta:

```bash
npx playwright install --with-deps chromium
```

Luego habilita los E2E con:

```bash
RUN_E2E=1 npm run test:e2e
```

## Roles soportados

- PACIENTE
- PROFESIONAL
- RECEPCIONISTA
- ADMINISTRADOR

## Rutas clave

- `/` Landing pública
- `/auth/login` Login con Credentials
- `/appointments/new` Crear turno (login requerido)
- `/portal/paciente`
- `/portal/profesional`
- `/portal/recepcionista`
- `/portal/admin`

## Analytics admin (KPIs por período)

Endpoint protegido:

```
GET /api/analytics/admin?range=last7
GET /api/analytics/admin?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD
```

Rangos soportados:

- `today` (hoy)
- `last7` (últimos 7 días)
- `last30` (últimos 30 días)
- `mtd` (mes actual)
- `ytd` (año en curso)
- `custom` (requiere `from` y `to`, inclusivo)

KPIs incluidos:

- `totalAppointments`: citas en el rango.
- `statusCounts`: distribución por estado.
- `newPatients`: pacientes creados en el rango.
- `activeProfessionals`: profesionales activos con citas en rango (si no hay citas, cuenta los activos).
- `totalSlots` y `bookedSlots`: slots disponibles vs ocupados.
- `utilizationRate`: ocupación (`bookedSlots / totalSlots`).
- `cancellations`: cancelaciones en el rango.

Timezone:

- Por defecto usa `America/Bogota`.
- Se puede sobreescribir con `ANALYTICS_TIME_ZONE`.

## Notas de producción

- Tailwind CSS v4 exige Node.js 20+.
- `prisma generate` debe ejecutarse en postinstall.
- `prisma migrate deploy` debe ejecutarse en el pipeline de producción.
