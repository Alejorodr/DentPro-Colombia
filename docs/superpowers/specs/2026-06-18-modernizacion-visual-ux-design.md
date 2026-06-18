# DentPro Colombia — Modernización Visual y UX

**Fecha:** 2026-06-18
**Estado:** Aprobado por usuario — listo para implementación
**Enfoque:** A+C (Shared-first + Critical fixes primero)
**Alcance:** Opción B — mejoras visuales + refactorización UX intra-pantalla, sin cambios de routing ni flujos de auth

---

## Contexto

DentPro Colombia es una clínica dental en Chía, Cundinamarca. La plataforma está en producción con usuarios reales en todos los roles. La base de datos es PostgreSQL/Neon con usuarios cargados y roles asignados activos.

Stack: Next.js 16 App Router, Tailwind v4, NextAuth, Prisma, Vercel, Playwright.

Roles activos en producción: `PACIENTE`, `PROFESIONAL`, `RECEPCIONISTA`, `ADMINISTRADOR`.

---

## Restricciones no negociables

- Login canónico en `/auth/login` — no mover, no duplicar
- `/portal/receptionist/dashboard` y `/portal/receptionist/schedule` no cambian de ruta
- No inventar funcionalidades clínicas nuevas
- No romper autenticación, roles ni middleware de protección de rutas
- Cada elemento interactivo que exista debe tener función real o se elimina
- Paleta: solo azules (`#031536` → `#e6f4ff`) y slates — sin verde, sin cálidos, sin morado

---

## Auditoría visual del estado actual

### Marketing site
Estado: bueno. Hero, Navbar frosted glass, BookingForm con gradiente único, Services y SpecialistsSlider correctos. Rediseño reciente (commit `9ad2899`) lo modernizó. No requiere trabajo en esta iteración.

### Portal — shell compartido
Sidebar `w-72`, blanco/95, nav rounded-xl. Problema: logo es texto `"DP"` en cuadro brand-teal — SVG del diente en `design-system/assets/` nunca se conectó.

Topbar sticky frosted glass. Problema: bell de notificaciones y botón `?` de ayuda son decorativos — al hacer click no ocurre nada.

### Auth `/auth/login`
Layout 2 columnas, badge "Portal clínico", form bien estructurado. Estado correcto, no requiere cambios.

### Portal admin
El más completo: KPIs, RevenueTrendChart, StaffOnDutyList, AppointmentsTable, PeriodSelector. Visualmente consistente. Falta comparativa δ% vs período anterior en KPIs.

---

## Auditoría de UX por rol

### PACIENTE
- Welcome card (avatar + nombre + ID de paciente) se renderiza en **todas** las páginas del portal vía `ClientPortalShell` — repetitiva e innecesaria en páginas de contenido como consentimientos o historial.
- Onboarding banner presente y funcional.
- CTA "Agendar cita" en topbar correcto.

### RECEPCIONISTA
- Dashboard mezcla colores prohibidos (`emerald-100/700`, `amber-100/700`) en status badges del staff.
- `ReceptionistTopbar` es un componente separado del `Topbar` genérico — duplicación innecesaria con comportamiento levemente distinto.
- Status badges no tienen variante dark mode.

### PROFESIONAL
- Calendar dinámico bien implementado con skeleton loading.
- Shell menos uniforme que otros roles.
- Funcionalidad de appointment detail no auditada completamente.

### ADMINISTRADOR
- KPIs muestran valor absoluto sin tendencia comparativa.
- AppointmentsTable usa status hardcodeados sin sistema unificado.

---

## Problemas de consistencia visual

1. **Colores prohibidos en status badges** — `ReceptionistDashboard.tsx` usa `emerald-100 text-emerald-700` (verde) y `amber-100 text-amber-700` (cálido). Viola paleta. Sin variante dark.

2. **Logo "DP" placeholder** — todos los portales muestran cuadro azul con texto. El SVG del diente existe en `design-system/assets/icon.svg`.

3. **Dos topbars** — `app/portal/components/layout/Topbar.tsx` (genérico) + `app/portal/receptionist/components/ReceptionistTopbar.tsx` (custom). Duplicación.

4. **Welcome card repetitiva** — `ClientPortalShell` inyecta la card encima de `{children}` en todas las rutas del portal paciente.

5. **Dark mode incompleto** — status badges del staff sin clases dark.

---

## Riesgos funcionales para producción

### CRÍTICO — verificar antes de cualquier cambio
- `app/globals.css:1` → `@config "../tailwind.config.js"`. Si este archivo fue eliminado en la sesión de limpieza anterior, el build de producción falla. Confirmar existencia de `tailwind.config.js` o corregir referencia al `.ts`.

### ALTO
- **Notification bell** (Topbar, todos los roles): botón sin implementación. `GET /api/users/me/notifications` existe y puede conectarse.
- **Botón ayuda `?`** (Topbar, todos los roles): sin destino ni acción.
- **Status badges sin dark mode**: usuarios de recepción en modo oscuro ven badges ilegibles.

### MEDIO
- `app/(dashboard)/`: directorio legacy que aún existe con código desactualizado. No sirve rutas activas pero agrega deuda técnica y riesgo de shadowing.

---

## Propuesta de diseño

### StatusBadge — componente unificado
Nuevo componente `app/portal/components/ui/StatusBadge.tsx` con variantes que reemplazan todos los status hardcodeados en el portal.

| Estado | Light | Dark |
|---|---|---|
| Disponible / Confirmado | `bg-brand-light text-brand-teal` | `bg-accent-cyan/15 text-accent-cyan` |
| Ocupado / Pendiente | `bg-slate-100 text-slate-700` | `bg-surface-muted text-slate-300` |
| Pausa / En espera | `bg-slate-200 text-slate-500` | `bg-surface-base/60 text-slate-400` |
| Sin turno / Cancelado | `bg-slate-100 text-slate-400` | `bg-surface-base text-slate-500` |
| Completado | `bg-brand-light/60 text-brand-indigo` | `bg-brand-teal/10 text-accent-cyan` |

### Notification bell
Dropdown con últimas 5 notificaciones + badge numérico de count. Consume `GET /api/users/me/notifications`. Al no haber notificaciones: estado vacío "Sin notificaciones nuevas". Bell en Topbar se convierte en botón funcional.

### Help button
Link `<a>` a `https://wa.me/573237968435` (`target="_blank" rel="noopener"`). Consistente con el número ya usado en el marketing site.

### Logo en Sidebar
Reemplazar cuadro "DP" por `<img src="/icon.svg" />` (32×32) + nombre de la clínica desde `brandTitle` prop. El `icon.svg` ya existe en `/public/`.

### Welcome card en ClientPortalShell
Renderizar condicionalmente solo cuando `pathname === "/portal/client"`. En todas las demás subrutas, omitir la card y dejar que `{children}` ocupe el espacio completo.

---

## Plan por fases

### Fase 0 — Critical fixes `[~2h | riesgo: mínimo]`

Objetivo: eliminar riesgos de producción sin cambios visuales visibles.

| Archivo | Cambio |
|---|---|
| `app/globals.css` | Verificar `@config` — si `tailwind.config.js` fue eliminado, restaurar o ajustar referencia |
| `app/portal/receptionist/dashboard/ReceptionistDashboard.tsx` | Reemplazar `staffStatusStyles` emerald/amber → clases slate/brand con variantes dark |
| `app/portal/components/layout/Topbar.tsx` | Bell → dropdown notificaciones funcional; `?` → link WhatsApp |
| `app/api/users/me/notifications/route.ts` | Verificar shape de respuesta compatible con dropdown |

### Fase 1 — Shared components `[~4h | propaga a los 4 roles automáticamente]`

Objetivo: mejorar los componentes que todos los roles comparten.

| Archivo | Cambio |
|---|---|
| `app/portal/components/layout/Sidebar.tsx` | Logo "DP" → `/public/icon.svg` 32×32 + brandTitle |
| `app/portal/components/ui/StatusBadge.tsx` | **Nuevo** — variantes de status según tabla de paleta aprobada |
| `app/portal/receptionist/components/ReceptionistTopbar.tsx` | Eliminar — migrar funcionalidad al `Topbar` genérico con slots |
| `app/portal/components/layout/Topbar.tsx` | Notificaciones dropdown completo + help link + dark mode |

### Fase 2 — RECEPCIONISTA `[~3h | pantallas más críticas operativamente]`

| Archivo | Cambio |
|---|---|
| `ReceptionistDashboard.tsx` | Usar `StatusBadge`, auditar acciones de tabla |
| `ReceptionistSchedule.tsx` | Auditar acciones de agenda, conectar botones de nueva cita |
| `components/AppointmentTable.tsx` | Verificar acciones por fila (confirmar, cancelar, reschedule) |
| `patients/page.tsx` | Auditar y conectar acciones vacías |
| `staff/page.tsx` | Auditar y conectar acciones vacías |
| `billing/page.tsx` | Auditar y conectar acciones vacías |

### Fase 3 — PROFESIONAL `[~3h]`

| Archivo | Cambio |
|---|---|
| `professional/calendar/ProfessionalCalendar.tsx` | Auditar acciones de cita; usar `StatusBadge` |
| `professional/appointment/[id]/` | Verificar notas, adjuntos, prescripción funcionando |
| `professional/components/` | Unificar con `StatusBadge` |
| `professional/episode/[id]/` | Verificar notas clínicas y adjuntos |

### Fase 4 — PACIENTE `[~2h]`

| Archivo | Cambio |
|---|---|
| `client/components/ClientPortalShell.tsx` | Welcome card → solo en `pathname === "/portal/client"` |
| `client/appointments/page.tsx` | Verificar acciones de reschedule/cancelar |
| `client/consents/page.tsx` | Auditar contenido y estados vacíos |
| `client/treatment-history/page.tsx` | Auditar contenido y estados vacíos |
| `client/profile/page.tsx` | Verificar edición de perfil funcional |

### Fase 5 — ADMINISTRADOR `[~2h]`

| Archivo | Cambio |
|---|---|
| `admin/_components/KPIStatCard.tsx` | Añadir campo `delta` opcional (δ% vs período anterior) |
| `admin/_components/AppointmentsTable.tsx` | Usar `StatusBadge` unificado |
| `admin/staff/page.tsx` | Auditar acciones de gestión de staff |
| `admin/patients/page.tsx` | Auditar acciones de gestión de pacientes |

**Tiempo total estimado: ~14h de implementación.**

---

## Pruebas antes de producción

### Bloqueantes (no deployar sin estas)
1. `npm run build` — pasa sin errores, especialmente si se toca `globals.css`
2. E2E Playwright por rol: login → ruta principal → navegación sidebar → sign out
3. Notification bell: fetch a `/api/users/me/notifications` sin crash con 0 notificaciones
4. Status badges: renderizado correcto en light y dark mode para los estados del staff

### Recomendadas
5. Screenshots de los 5 dashboards críticos a 1440×900 y 375×812 (móvil)
6. Dark mode toggle en las 5 pantallas críticas — sin textos sobre fondos del mismo tono
7. Acciones de cita en `/portal/receptionist/schedule` — crear, modificar y cancelar una cita de prueba con usuario real de staging
8. Verificar que `app/(dashboard)/` no está sirviendo ninguna ruta activa (ningún `page.tsx` en ese directorio debería ser alcanzable)

---

## Criterios de éxito

- Cero botones/íconos decorativos sin función en el portal
- Cero colores fuera de paleta (sin verde, sin cálidos, sin morado) en cualquier componente del portal
- Dark mode completo en todos los componentes modificados
- `npm run build` pasa sin errores
- E2E de login pasa para los 4 roles
- Logo SVG visible en sidebar de todos los portales
- Notification bell retorna respuesta y renderiza sin crash
