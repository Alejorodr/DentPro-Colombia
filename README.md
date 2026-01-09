# DentPro Colombia

Sistema de gestión de turnos clínicos con Next.js App Router, Prisma y NextAuth (Credentials).

## Requisitos

- Node.js 20+
- Base de datos Postgres (Neon recomendado)

## Configuración

1. Copia el archivo de entorno:

```bash
cp .env.example .env
```

2. Completa las variables obligatorias:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` (opcional en Vercel/Neon: usado para migraciones y diff)
- `OPS_ENABLED=false`
- `OPS_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://dent-pro-colombia.vercel.app/`
- `AUTH_TRUST_HOST=true`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `RESEND_API_KEY` (producción)
- `EMAIL_FROM` (producción)
- `NEXT_PUBLIC_APP_URL` (local)

3. Genera el cliente Prisma y aplica migraciones:

```bash
npm run prisma generate
npx prisma migrate deploy
```

4. Ejecuta el seed:

```bash
npm run prisma:seed
```

## Operaciones de producción (temporal, remover luego)

Estos endpoints están pensados solo para la inicialización de la base de datos en producción. **Remuévelos después de usarlos**.

1. En Vercel, configura variables:
   - `OPS_ENABLED=true`
   - `OPS_KEY=<clave-secreta>`
   - `SEED_ADMIN_EMAIL=kevinrodr@hotmail.com`
   - `SEED_ADMIN_PASSWORD=<password-seguro>`
2. Ejecuta migraciones:

```bash
curl -X POST https://dent-pro-colombia.vercel.app/api/ops/migrate \\
  -H "X-OPS-KEY: <clave-secreta>"
```

3. Crea/actualiza el admin:

```bash
curl -X POST https://dent-pro-colombia.vercel.app/api/ops/seed-admin \\
  -H "X-OPS-KEY: <clave-secreta>"
```

4. Desactiva el acceso temporal:
   - `OPS_ENABLED=false`
   - Redeploy
5. Inicia sesión con el admin configurado.


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

### Flujo local rápido

1. Ejecuta el seed con tu correo.
2. Visita `/auth/forgot-password` e ingresa el correo.
3. Copia el link desde la consola (solo en desarrollo).
4. Define la nueva contraseña y vuelve a iniciar sesión.

## Scripts útiles

- `npm run dev`: entorno local
- `npm run build`: build de producción
- `npm run lint`: lint
- `npm run test`: tests unitarios

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

## Notas de producción

- `prisma generate` debe ejecutarse en postinstall.
- `prisma migrate deploy` debe ejecutarse en el pipeline de producción.
