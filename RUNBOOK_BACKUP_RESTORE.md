# Runbook: Backup y Restore (Neon)

## Objetivo
Definir el procedimiento para validar backups automáticos en Neon y restaurar datos sin afectar producción.

## Backups en Neon
- **Frecuencia**: Neon mantiene backups automáticos con Point-In-Time Recovery (PITR) y snapshots periódicos según el plan.
- **Retención**: Configurada en Neon (mínimo recomendado 30 días operativos). Ajustar según política legal interna.
- **Verificación**: revisar en la UI de Neon que la ventana de retención y la frecuencia estén activas.

## Escenarios de restore
### 1) Borrado accidental
1. Identificar la hora del incidente.
2. Crear un branch nuevo desde el punto de recuperación más cercano.
3. Conectar el branch restaurado a un entorno de validación.
4. Verificar datos críticos (pacientes, citas, historia clínica).

### 2) Corrupción lógica
1. Determinar el rango temporal de corrupción.
2. Crear un branch desde un punto anterior al incidente.
3. Comparar con producción para identificar entidades afectadas.
4. Planificar la reintroducción controlada de cambios válidos.

### 3) Caída total / indisponibilidad
1. Crear un branch restaurado desde el último punto consistente.
2. Actualizar `DATABASE_URL` en el entorno de contingencia.
3. Validar salud de la app y endpoints críticos antes de reabrir tráfico.

## Procedimiento de restore (paso a paso)
1. En Neon, selecciona el proyecto y ve a **Backups**.
2. Elige el snapshot/PITR deseado.
3. Crea un **branch** nuevo (ej. `restore-YYYY-MM-DD`).
4. Copia el `DATABASE_URL` del branch restaurado.
5. Conecta el branch al entorno de validación (nunca reemplazar producción directamente).

## Validación post-restore (simulación)
Ejecutar en el entorno de validación:
1. Migraciones:
   - `npx prisma migrate deploy`
2. Build:
   - `npm run vercel-build`
3. Endpoints críticos:
   - Login
   - Citas (`/api/appointments`)
   - Historia clínica (`/api/clinical/...`)
4. Consistencia de datos:
   - Verificar conteo de pacientes vs. citas
   - Validar integridad de episodios clínicos

## Integridad y cierre
- Documentar el restore en el registro de incidentes.
- Confirmar que las métricas vuelven a reportar normalmente.
- Reaplicar configuraciones de seguridad (tokens, SMTP, Sentry).
