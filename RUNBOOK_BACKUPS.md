# Runbook: Backups y Restore (Neon)

## Objetivo
Definir el procedimiento operativo para verificar backups automáticos y ejecutar restauraciones a un branch seguro de Neon, sin afectar producción.

## Verificación de backups automáticos (Neon UI)
1. Ingresa al panel de Neon.
2. Selecciona el proyecto de la clínica.
3. Abre la sección **Backups**.
4. Confirma que:
   - Hay backups automáticos recientes (últimas 24h).
   - El retén mínimo configurado cumple con la política interna (ej. 5 años configurables).

> Nota: este proyecto no depende de API de Neon para la verificación; usa la UI oficial.

## Restore a un branch seguro
1. En Neon, crea un **branch nuevo** desde el backup deseado.
2. Asigna un nombre descriptivo (ej. `restore-2026-03-15`).
3. Copia el nuevo `DATABASE_URL` del branch restaurado.
4. **No** reemplaces producción. Usa el branch para validaciones.

## Checklist post-restore
- [ ] Ejecutar migraciones: `npx prisma migrate deploy`.
- [ ] Verificar acceso a la app con `npm run vercel-build`.
- [ ] Validar endpoints críticos (login, citas, historia clínica).
- [ ] Verificar variables de entorno (tokens, secretos, Blob, Sentry).

## Purga manual / solicitudes de borrado
1. Crear un export o respaldo legal si aplica.
2. Ejecutar borrado lógico en datos clínicos (episodios/adjuntos) como administrador.
3. Registrar el request en el sistema interno de tickets.

## Política de retención (placeholder)
- Retención mínima recomendada: **5 años**.
- Ajustar según regulación local y políticas internas.
