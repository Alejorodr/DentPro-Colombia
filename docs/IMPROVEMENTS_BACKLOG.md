# Improvements Backlog

Estado: revisado el 2026-11-24. Los P0 y P1 ya fueron implementados y se conservan abajo como historial de cierre. De los P2 solo queda abierto el segundo factor (MFA).

## Cerrado

- Guardas de endpoints operativos y diagnóstico de auth/env.
- Paridad Node 24 entre local, CI y Vercel.
- Smoke E2E contra pantalla en blanco.
- Telemetría configurable en CI.
- Warning de rate limit controlado y emitido una sola vez por proceso.
- Paginación de catálogos en recepción (DOG-23): los selectores traen todas las páginas con `fetchAllPages`.
- `prisma generate` duplicado en Vercel (DOG-21): ya estaba resuelto; el `postinstall` se salta con `VERCEL=1`.
- Matriz de responsables por dominio (DOG-24): sección 7 de `docs/ARCHITECTURE_MAP.md`.
- Tests contractuales por rol (DOG-22): `tests/api-role-contracts.test.ts`.

## Mejoras opcionales

## P2 — Performance / Tech Debt

1. **Segundo factor para roles privilegiados**
   - Riesgo: medio; actualmente el acceso depende de credenciales y controles de rol.
   - Impacto: alto para endurecer ADMINISTRADOR/PROFESIONAL.
   - Validación: flujo MFA completo, recuperación, auditoría y pruebas de autenticación.

2. **Buscador de pacientes en documentos y resultados de laboratorio del profesional**
   - Riesgo: bajo hoy; medio cuando un profesional pase de 50 pacientes.
   - Impacto: medio. `ProfessionalDocuments` y `ProfessionalLabResults` piden `/api/professional/patients?pageSize=50` y el selector no muestra a quien pase de 50.
   - Validación: selector con búsqueda en el servidor (como `ProfessionalPatients`) y cobertura de UI.
