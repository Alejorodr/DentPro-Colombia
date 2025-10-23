# Migraciones y datos semilla

Este proyecto utiliza Prisma con SQLite para persistir usuarios, roles y sesiones de NextAuth.

## Ejecutar migraciones

1. Asegúrate de haber instalado las dependencias (`npm install`).
2. Configura la variable `DATABASE_URL` en tu entorno (consulta `.env.example`).
3. Aplica las migraciones usando Prisma:

```bash
npm run prisma migrate dev
```

> Prisma generará automáticamente el cliente y aplicará las migraciones a la base de datos indicada en `DATABASE_URL`.

## Cargar datos semilla

El comando `npm run db:seed` ejecuta `prisma/seed.js`, que inserta usuarios demo y asegura que los roles base (`patient`, `professional`, `reception`, `admin`) queden asignados.

```bash
npm run db:seed
```

- Puedes sobreescribir la contraseña usada por el seed exportando `SEED_PASSWORD`.
- Si trabajas con una ruta de base de datos personalizada, exporta `DATABASE_URL` antes de ejecutar el script.

### Usuario administrador por defecto

Al ejecutar el seed se crea (o sincroniza) el usuario administrador principal:

- **Correo:** `admin@dentpro.co`
- **Contraseña:** valor de `SEED_PASSWORD` (por defecto `demo123`)

Puedes iniciar sesión con estas credenciales en el panel (`/admin`). Recuerda cambiarlas en producción exportando `SEED_PASSWORD` antes de correr el script.

## Actualizar catálogos de roles y permisos

1. Añade o modifica los valores en la tabla correspondiente mediante una nueva migración generada con Prisma.
2. Opcionalmente, crea un script de seed adicional que inserte los nuevos slugs.
3. Ejecuta de nuevo las migraciones con el comando descrito arriba y vuelve a correr el seed para reflejar los cambios en usuarios existentes.

Mantener los catálogos bajo control de versiones (archivos dentro de `prisma/migrations/`) garantiza que los entornos de desarrollo y producción permanezcan sincronizados.
