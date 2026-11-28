/**
 * DSN de Sentry para el servidor y el edge (DOG-69).
 *
 * En Vercel, `SENTRY_DSN` apunta al proyecto `dogbyte/dentpro-colombia`. `NEXT_PUBLIC_SENTRY_DSN`
 * queda como respaldo por si se conecta la integración de Sentry del Marketplace de Vercel, que
 * inyecta solo esa variable. Sin ninguno de los dos, Sentry queda apagado
 * (local y E2E). Las referencias son literales para que Next.js pueda resolverlas en el build.
 */
export function sentryDsn(): string | undefined {
  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}
