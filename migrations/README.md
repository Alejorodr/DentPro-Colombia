# Migraciones y datos semilla

Este proyecto utiliza SQLite (mediante `better-sqlite3`) para persistir usuarios, roles y sesiones de NextAuth.

## Ejecutar migraciones

1. Asegúrate de haber instalado las dependencias (`npm install`).
2. Ejecuta el script SQL sobre la base de datos configurada en `AUTH_DATABASE_URL` (por defecto `./dentpro.db`):

```bash
sqlite3 ${AUTH_DATABASE_URL:-dentpro.db} < migrations/001_create_auth_tables.sql
```

> 💡 El fichero crea las tablas `roles`, `permissions`, `role_permissions`, `users`, `user_roles`, `user_permissions`, así como las tablas necesarias para almacenar sesiones y cuentas de NextAuth.

## Cargar datos semilla

El repositorio incluye `scripts/seed.cjs`, que inserta usuarios demo y asegura que los roles base (`patient`, `professional`, `reception`, `admin`) queden asignados.

```bash
node scripts/seed.cjs
```

- Puedes sobreescribir la contraseña usada por el seed exportando `SEED_PASSWORD`.
- Si trabajas con una ruta de base de datos personalizada, exporta `AUTH_DATABASE_URL` antes de ejecutar el script.

### Usuario administrador por defecto

Al ejecutar el seed se crea (o sincroniza) el usuario administrador principal:

- **Correo:** `admin@dentpro.co`
- **Contraseña:** valor de `SEED_PASSWORD` (por defecto `demo123`)

Puedes iniciar sesión con estas credenciales en el panel (`/admin`). Recuerda cambiarlas en producción exportando `SEED_PASSWORD` antes de correr el script.

## Actualizar catálogos de roles y permisos

1. Añade o modifica los valores en la tabla correspondiente mediante una nueva migración SQL.
2. Opcionalmente, crea un script de seed adicional que inserte los nuevos slugs.
3. Ejecuta de nuevo las migraciones con el comando descrito arriba y vuelve a correr el seed para reflejar los cambios en usuarios existentes.

Mantener los catálogos bajo control de versiones (nuevos archivos dentro de `migrations/`) garantiza que los entornos de desarrollo y producción permanezcan sincronizados.
