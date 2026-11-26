# Runbook: backups y restauración (Neon y Vercel Blob)

## Objetivo
Verificar que los backups automáticos funcionan y restaurar datos sin tocar producción.

## Backups en Neon
- **Frecuencia:** Neon guarda backups automáticos con recuperación a un momento dado (PITR) y snapshots periódicos, según el plan.
- **Retención:** se configura en Neon. Lo mínimo recomendado son 30 días operativos; ajústala según la política legal interna (la retención clínica es de 5 años, ver `DATA_POLICY.md`).
- **Verificación periódica:**
  1. Entra al panel de Neon y abre el proyecto de la clínica.
  2. Ve a **Backups**.
  3. Confirma que haya backups de las últimas 24 horas y que la ventana de retención esté activa.

## Escenarios de restauración
### 1) Borrado accidental
1. Identifica la hora del incidente.
2. Crea un branch nuevo desde el punto de recuperación más cercano.
3. Conecta el branch restaurado a un entorno de validación.
4. Verifica los datos críticos: pacientes, citas e historia clínica.

### 2) Corrupción lógica
1. Determina en qué rango de tiempo ocurrió la corrupción.
2. Crea un branch desde un punto anterior al incidente.
3. Compara con producción para identificar qué registros se afectaron.
4. Planea cómo reintroducir de forma controlada los cambios válidos.

### 3) Caída total
1. Crea un branch restaurado desde el último punto consistente.
2. Actualiza `DATABASE_URL` en el entorno de contingencia.
3. Valida la salud de la app y los endpoints críticos antes de reabrir el tráfico.

## Procedimiento paso a paso
1. En Neon, abre el proyecto y ve a **Backups**.
2. Elige el snapshot o el momento (PITR) que quieres recuperar.
3. Crea un **branch** nuevo con un nombre descriptivo, por ejemplo `restore-2026-03-15`.
4. Copia el `DATABASE_URL` del branch restaurado.
5. Conéctalo a un entorno de validación. **Nunca** reemplaces producción directamente.

## Validación después de restaurar
- [ ] Aplica las migraciones: `pnpm exec prisma migrate deploy`.
- [ ] Haz el build: `pnpm run vercel-build`.
- [ ] Prueba el login, las citas (`/api/appointments`) y la historia clínica (`/api/clinical/...`).
- [ ] Revisa la consistencia de los datos: compara el conteo de pacientes con el de citas y valida los episodios clínicos.
- [ ] Revisa las variables de entorno: secretos, llaves de cifrado (`FIELD_ENCRYPTION_KEY` y `FIELD_HASH_KEY`), Blob, SMTP y Sentry.
- [ ] Confirma que se pueden abrir los adjuntos clínicos en Vercel Blob.

## Respaldo de archivos (Vercel Blob)
- Exporta periódicamente los objetos con prefijo `clinical-private/` y guárdalos en un bucket externo seguro.
- Verifica que el plan de Blob soporte el tamaño máximo de adjuntos configurado (10 MB).

## Purga manual o solicitudes de borrado
1. Si aplica, crea primero un export o un respaldo legal.
2. Como administrador, haz el borrado lógico de los datos clínicos (episodios y adjuntos).
3. Registra la solicitud en el sistema de tickets.

## Cierre
- Documenta la restauración en el registro de incidentes (`RUNBOOK_INCIDENTS.md`).
- Confirma que las métricas vuelven a reportar con normalidad.
