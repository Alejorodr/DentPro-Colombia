# Security Model

## Roles
- **ADMINISTRADOR**: acceso completo a gestión de usuarios y configuración global.
- **RECEPCIONISTA**: gestión operativa (pacientes, agenda, servicios) sin privilegios administrativos completos.
- **PROFESIONAL**: acceso a su propia agenda y datos clínicos asociados.
- **PACIENTE**: acceso únicamente a su información y citas.

## Reglas por endpoint (resumen)

### Usuarios
- `GET /api/users` → **ADMINISTRADOR**
- `POST /api/users` → **ADMINISTRADOR**
- `PATCH /api/users/[id]` → **ADMINISTRADOR**
- `DELETE /api/users/[id]` → **ADMINISTRADOR**
- `GET/PATCH /api/users/me` → cualquier usuario autenticado (solo su propio perfil)

### Pacientes
- `GET /api/patients` → **ADMINISTRADOR**, **RECEPCIONISTA**
- `POST /api/patients` → **ADMINISTRADOR**, **RECEPCIONISTA**
- `PATCH /api/patients/[id]` → **ADMINISTRADOR**, **RECEPCIONISTA**
- `DELETE /api/patients/[id]` → **ADMINISTRADOR**, **RECEPCIONISTA**

### Cliente
- `GET /api/client/*` → **PACIENTE** (solo su propia data)
- `POST /api/client/appointments` → **PACIENTE** (crea citas propias)

### Profesional
- `GET /api/professional/*` → **PROFESIONAL**
- `POST /api/professional/*` → **PROFESIONAL**
- `GET/POST /api/professional/appointment/[id]/*` → **PROFESIONAL** y solo si la cita pertenece al profesional

### Citas
- `GET /api/appointments` → **ADMINISTRADOR**, **RECEPCIONISTA**, **PROFESIONAL**, **PACIENTE** (filtrado por rol)
- `POST /api/appointments` → **ADMINISTRADOR**, **RECEPCIONISTA**, **PACIENTE**
- `PATCH /api/appointments/[id]` → dueño (paciente/profesional) o **ADMINISTRADOR/RECEPCIONISTA**
- `POST /api/appointments/[id]/reschedule` → dueño o **ADMINISTRADOR/RECEPCIONISTA**

### Search
- `GET /api/search` → **ADMINISTRADOR**, **RECEPCIONISTA**, **PROFESIONAL** (y solo scope permitido)

### Clínica (historia clínica y adjuntos)
- `GET /api/clinical/patients/[patientId]/episodes` → **ADMINISTRADOR**, **PROFESIONAL** (pacientes atendidos), **PACIENTE** (solo visibles)
- `POST /api/clinical/patients/[patientId]/episodes` → **ADMINISTRADOR**, **PROFESIONAL** (solo sus pacientes)
- `GET/PATCH/DELETE /api/clinical/episodes/[episodeId]` → **ADMINISTRADOR** (todo), **PROFESIONAL** (solo sus episodios)
- `GET/POST /api/clinical/episodes/[episodeId]/notes` → **ADMINISTRADOR**, **PROFESIONAL** (solo sus episodios)
- `GET/POST /api/clinical/episodes/[episodeId]/prescriptions` → **ADMINISTRADOR**, **PROFESIONAL** (solo sus episodios), **PACIENTE** (solo episodios visibles)
- `GET/POST /api/clinical/episodes/[episodeId]/attachments` → **ADMINISTRADOR**, **PROFESIONAL** (solo sus episodios), **PACIENTE** (solo visibles)
- `GET /api/clinical/attachments/[attachmentId]/download` → **ADMINISTRADOR**, **PROFESIONAL** (solo sus episodios), **PACIENTE** (solo visibles)
- `DELETE /api/clinical/attachments/[attachmentId]` → **ADMINISTRADOR**, **PROFESIONAL** (solo sus episodios)
- `GET /api/admin/audit/access-logs` → **ADMINISTRADOR**

## IDOR checklist aplicado
- Recursos con `[id]` validan pertenencia (paciente o profesional) antes de leer/modificar.
- Roles elevados (`ADMINISTRADOR`, `RECEPCIONISTA`) pueden operar sobre recursos compartidos.
- No se confía en `id` del cliente sin filtrar por sesión.

## Rate limiting
- Auth: **10/min**
- Search: **30/min**
- Appointments: **30/min**
- General API: **60/min**

> Nota: en producción se recomienda Upstash para límites persistentes.
