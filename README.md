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
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://dent-pro-colombia.vercel.app/`
- `AUTH_TRUST_HOST=true`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

3. Genera el cliente Prisma y aplica migraciones:

```bash
npm run prisma generate
npx prisma migrate deploy
```

4. Ejecuta el seed:

```bash
npm run prisma:seed
```

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

