/**
 * DSN de Sentry para el servidor y el edge (DOG-69).
 *
 * La integración de Sentry del Marketplace de Vercel inyecta `NEXT_PUBLIC_SENTRY_DSN` y rota la
 * clave por su cuenta, así que no se copia a mano a `SENTRY_DSN`. `SENTRY_DSN` sigue teniendo
 * prioridad para quien lo configure explícitamente. Sin ninguno de los dos, Sentry queda apagado
 * (local y E2E). Las referencias son literales para que Next.js pueda resolverlas en el build.
 */
export function sentryDsn(): string | undefined {
  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}
