# Política de Acceso — DentPro Colombia

## Roles soportados
- **ADMINISTRADOR**
- **RECEPCIONISTA**
- **PROFESIONAL**
- **PACIENTE**

## Principios
1. **Mínimo privilegio**: cada rol solo accede a lo necesario para su operación.
2. **Una clínica**: no existe separación multi-tenant.
3. **Auditoría**: accesos clínicos se registran con logs estructurados.

## Permisos por rol
### Administrador
- Acceso completo a configuración, usuarios, servicios, campañas y métricas.
- Acceso a historia clínica completa.
- Puede exportar datos de pacientes (JSON).
- Puede ejecutar borrado lógico y solicitar borrado definitivo según política.

### Recepcionista
- Gestiona citas, pacientes y agenda.
- **No** puede acceder a notas clínicas detalladas, adjuntos clínicos ni prescripciones.
- Puede consultar información administrativa mínima para operar la agenda.

### Profesional
- Acceso a agenda personal y pacientes asignados.
- Acceso a historia clínica de pacientes con los que tiene relación clínica.
- Puede crear/actualizar episodios, notas, prescripciones y adjuntos según permisos.

### Paciente
- Acceso a sus propias citas, perfil y consentimientos.
- Puede solicitar/exportar su propia información (JSON).
- Solo ve datos clínicos marcados como visibles para paciente.

## Exclusiones explícitas
- Recepcionista ≠ acceso a historia clínica completa.
- Paciente ≠ acceso a registros clínicos internos no visibles.
- Profesional ≠ acceso a pacientes fuera de su relación clínica.

## Exportaciones
- **Admin**: `/api/admin/patients/[id]/export`
- **Paciente**: `/api/client/data-export`

Las exportaciones son JSON y registran auditoría de acceso.
