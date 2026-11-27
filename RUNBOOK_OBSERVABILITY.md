# Runbook: Observabilidad (Sentry + Logs)

## Objetivo
Capturar errores reales en producción sin exponer PII ni secretos, y contar con logs estructurados con `requestId` para facilitar trazabilidad.

## Variables de entorno (Vercel)
Sentry llega por la integración del Marketplace de Vercel (recurso `sentry-cobalt-grass`, conectado a `dent-pro-colombia` solo en Production, DOG-69). Al conectarla, Vercel inyecta y rota por su cuenta:

- `NEXT_PUBLIC_SENTRY_DSN`: el código del servidor y del edge lo usa cuando no hay `SENTRY_DSN` (`lib/monitoring/sentry-dsn.ts`). El cliente no se instrumenta.
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`: para la API de Sentry y releases; el build no los usa.
- `SENTRY_PUBLIC_KEY`, `SENTRY_VERCEL_LOG_DRAIN_URL`, `SENTRY_OTLP_TRACES_URL`: de la integración; no se usan en el código.

Variables propias, en Production:
- `SENTRY_ENVIRONMENT=production`
- `MONITORING_TEST_TOKEN`: habilita la prueba controlada. La copia local vive en `~/.dentpro/monitoring.env`, fuera del repo.
- Opcionales: `SENTRY_TRACES_SAMPLE_RATE` (por defecto `0.05`), `LOG_LEVEL` (`info` o `warn`).

> `SENTRY_DSN` sigue funcionando y tiene prioridad si alguien lo configura a mano. Sin ningún DSN, Sentry queda apagado (local y E2E). No copiar el DSN de la integración a `SENTRY_DSN`: la integración rota la clave y la copia quedaría vieja.

## Activación paso a paso (Vercel)
1. Conectar el recurso de Sentry al proyecto (Storage/Integrations → `sentry-cobalt-grass` → Connect Project), solo Production.
2. Agregar `SENTRY_ENVIRONMENT=production` y `MONITORING_TEST_TOKEN` en Production.
3. Desplegar nuevamente. Las variables solo aplican a deploys nuevos.
4. Verificar con la prueba controlada (abajo) que el evento aparece en Sentry.

## Logs estructurados
Los logs en API usan JSON con:
- `timestamp`, `level`, `msg`
- `route`, `userId`, `requestId`
- `durationMs` y `status` cuando aplica

El `requestId` se genera en middleware y se propaga en `x-request-id` en cada respuesta.

### Auditoría clínica
Además de los logs de aplicación, las acciones clínicas generan registros en `AccessLog`:
- Lectura, creación y actualización de episodios clínicos.
- Descarga de adjuntos clínicos.
- Impresión/exportación de resúmenes y recetas.

Estos registros se consultan desde `/portal/admin/audit` o `GET /api/admin/audit/access-logs`.

Si falla la persistencia del `AccessLog`, ahora se emite log estructurado con:
- `event=clinical.access_log.write_failed`
- `route`, `requestId`, `userId`, `action`, `patientId`
- error sanitizado por `lib/logger.ts` (sin exponer secrets/headers/cookies)

## Checklist de verificación
- [ ] En desarrollo, dispara un error controlado: `GET /api/monitoring?error=1` con el header `x-monitoring-test-token`.
- [ ] Verifica que el evento aparece en Sentry (con la integración conectada o `SENTRY_DSN` configurado).
- [ ] Verifica que los logs incluyen `requestId` y no exponen datos sensibles.

## Buenas prácticas
- No loggear `DATABASE_URL` ni tokens.
- No imprimir headers completos ni body en endpoints sensibles.
- Mantener `sendDefaultPii=false` en Sentry.
