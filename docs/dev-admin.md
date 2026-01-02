# Usuario admin de desarrollo

Este proyecto incluye un usuario **solo para entornos de desarrollo y pruebas**. El usuario se crea mediante el seed de Prisma y no debe emplearse en producción.

## Credenciales

- **Email:** `admin@dentpro.local`
- **Password:** `DentProDev!Admin1`

## Creación (seed)

1. Ejecuta el seed de Prisma:
   ```bash
   npm run prisma:seed
   ```
2. Inicia sesión en `/login` con las credenciales anteriores. El rol `admin` permite acceder a rutas `/admin/**`.

> Nota: si `NODE_ENV` es `production`, el seed omite la creación del usuario admin.

## Cómo desactivar o eliminar

- No ejecutes el comando de seed en producción.
- Elimina el usuario desde la base de datos (tabla `users`) o borra la entrada en `prisma/seed.ts` si ya no deseas generarlo.
