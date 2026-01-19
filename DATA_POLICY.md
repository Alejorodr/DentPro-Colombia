# Política de Datos — DentPro Colombia

## Alcance
Esta política aplica a la única clínica operando en DentPro Colombia (no multi-tenant) y cubre el ciclo de vida de los datos almacenados en la plataforma.

## Datos que se almacenan
1. **Identidad y acceso**
   - Usuarios (nombre, apellido, email, rol, contraseña hasheada).
   - Tokens de recuperación de contraseña.
2. **Perfil de pacientes**
   - Datos de contacto, documento, aseguradora, ciudad y estado del perfil.
3. **Operación clínica**
   - Citas y disponibilidad (horarios, estados, motivo, notas).
   - Historia clínica (episodios, notas clínicas, prescripciones).
   - Consentimientos firmados.
4. **Archivos y adjuntos**
   - Metadatos y referencias (URL/clave de storage, tipo, tamaño, checksum).
   - No se almacenan binarios en el repositorio.
5. **Auditoría y seguridad**
   - Logs de acceso clínico (ruta, acción, usuario, paciente, requestId).
6. **Notificaciones**
   - Preferencias y registros de notificaciones internas.

## Retención
- **Datos clínicos**: mínimo 5 años o según normativa local.
- **Auditoría clínica**: mínimo 5 años.
- **Citas y disponibilidad**: mantener histórico operativo mínimo 2 años.
- **Backups (Neon)**: retención operativa configurada en Neon (ver `RUNBOOK_BACKUP_RESTORE.md`).

> Ajustar retención conforme a regulaciones locales y acuerdos internos.

## Borrado y soft-delete
- **Soft-delete**: se usa en entidades clínicas sensibles (episodios, notas, adjuntos, prescripciones) mediante campos `deletedAt` y `deletedByUserId`.
- **Borrado definitivo**: solo se ejecuta por un administrador autorizado después de cumplir requisitos legales y con respaldo validado.
- **Usuarios/pacientes**: eliminación administrativa elimina sus relaciones directas; para datos clínicos se conserva la trazabilidad con soft-delete cuando aplica.

## Acceso
El acceso se rige por roles y está detallado en `ACCESS_POLICY.md`.

## Exportaciones
- **Administración**: exportación JSON básica de pacientes para cumplimiento y auditoría.
- **Paciente**: exportación JSON de su propia información.

No se generan archivos binarios para exportaciones.
