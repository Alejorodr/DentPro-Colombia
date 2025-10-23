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

El comando `npm run db:seed` ejecuta `prisma/seed.js`, que inserta usuarios base y asegura que los roles (`patient`, `professional`, `reception`, `admin`) queden asignados.

```bash
npm run db:seed
```

- Debes definir una contraseña segura para los usuarios iniciales exportando `SEED_PASSWORD` antes de ejecutar el script. El valor no se registrará ni se mostrará en consola.
- Si trabajas con una ruta de base de datos personalizada, exporta `DATABASE_URL` antes de ejecutar el script.

### Usuario administrador por defecto

Al ejecutar el seed se crea (o sincroniza) el usuario administrador principal (`admin@dentpro.co`).

- **Contraseña:** definida por la variable de entorno `SEED_PASSWORD`.

Configura un valor robusto en `SEED_PASSWORD` para cada entorno (desarrollo, pruebas y producción) antes de correr el comando. Una vez ejecutado, comparte la contraseña únicamente por canales seguros y cámbiala si sospechas que se ha filtrado.

## Actualizar catálogos de roles y permisos

1. Añade o modifica los valores en la tabla correspondiente mediante una nueva migración generada con Prisma.
2. Opcionalmente, crea un script de seed adicional que inserte los nuevos slugs.
3. Ejecuta de nuevo las migraciones con el comando descrito arriba y vuelve a correr el seed para reflejar los cambios en usuarios existentes.

Mantener los catálogos bajo control de versiones (archivos dentro de `prisma/migrations/`) garantiza que los entornos de desarrollo y producción permanezcan sincronizados.
