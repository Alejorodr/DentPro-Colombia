# Modernización Visual y UX — DentPro Colombia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar elementos decorativos sin función, unificar paleta de colores del portal y mejorar consistencia visual en los 4 roles sin tocar routing ni auth.

**Architecture:** Enfoque A+C — critical fixes primero (globals.css, paleta, botones muertos), luego shared components (logo, StatusBadge, NotificationsBell), luego por rol. Cada tarea es independiente y se puede deployar sola. El `PortalShell.tsx` ya despacha a los shells por rol (ClientPortalShell / ReceptionistShell / ProfessionalShell), así que los fixes por rol no afectan los otros.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, Phosphor Icons (`@/components/ui/Icon`), NextAuth, TypeScript estricto. Tests con Playwright (E2E en `tests/`).

## Global Constraints

- Paleta: solo `brand-teal (#0a3d91)`, `brand-indigo (#1f6cd3)`, `brand-sky (#4cc3f1)`, `brand-light (#e6f4ff)`, `accent-cyan (#5bd0ff)`, y variantes `slate-*`. Sin emerald, amber, verde, morado ni cálidos.
- Iconos: SIEMPRE desde `@/components/ui/Icon`, nunca `@phosphor-icons/react` directo.
- Dark mode: toda clase `bg-*`/`text-*` nueva debe llevar variante `dark:`.
- Español Colombia en contenido. Navegación del portal en inglés (ya establecido).
- Sin cambios de routing. Sin cambios en `auth.ts`, `auth.config.ts`, ni middleware.
- `npm run build` debe pasar sin errores antes de cada commit.
- Commits frecuentes — uno por task.

---

## Fase 0 — Critical Fixes

### Task 0.1: Corregir referencia rota en globals.css

**Files:**
- Modify: `app/globals.css:1`

**Interfaces:**
- Produces: build de producción sin error de `@config`

**Context:** `tailwind.config.js` fue eliminado en cleanup anterior pero `globals.css:1` sigue referenciando `"../tailwind.config.js"`. El archivo canónico es `tailwind.config.ts`. Tailwind v4 acepta `.ts` en el `@config`.

- [ ] **Step 1: Verificar el estado actual**

```bash
ls tailwind.config* 
# Espera ver: tailwind.config.ts (SIN .js)
head -1 app/globals.css
# Espera ver: @config "../tailwind.config.js";
```

- [ ] **Step 2: Corregir la línea**

En `app/globals.css`, cambiar la línea 1:

```css
/* ANTES */
@config "../tailwind.config.js";

/* DESPUÉS */
@config "../tailwind.config.ts";
```

- [ ] **Step 3: Verificar que el build pasa**

```bash
npm run build
# Espera: compilación exitosa sin errores de @config
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "fix(styles): corregir referencia @config a tailwind.config.ts"
```

---

### Task 0.2: Conectar botón de ayuda en Topbar genérico

**Files:**
- Modify: `app/portal/components/layout/Topbar.tsx`

**Interfaces:**
- Produces: botón `?` en admin y client que abre WhatsApp de soporte en nueva pestaña

**Context:** El `Topbar` genérico (usado por admin y client) tiene un `<button>` con ícono `Question` que no hace nada. Se convierte en un `<a>` hacia WhatsApp.

- [ ] **Step 1: Reemplazar el botón decorativo**

En `app/portal/components/layout/Topbar.tsx`, reemplazar el bloque del botón de ayuda (líneas ~76–84):

```tsx
/* ANTES */
<button
  type="button"
  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-200"
  aria-label="Ayuda"
  title="Ayuda"
>
  <Question aria-hidden="true" className="h-5 w-5" weight="bold" />
</button>

/* DESPUÉS */
<a
  href="https://wa.me/573237968435"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-200"
  aria-label="Soporte por WhatsApp"
  title="Soporte por WhatsApp"
>
  <Question aria-hidden="true" className="h-5 w-5" weight="bold" />
</a>
```

- [ ] **Step 2: Verificar en dev**

```bash
npm run dev
# Navegar a /portal/admin o /portal/client
# Hacer click en el ícono ? — debe abrir wa.me/573237968435 en nueva pestaña
```

- [ ] **Step 3: Commit**

```bash
git add app/portal/components/layout/Topbar.tsx
git commit -m "fix(portal): conectar botón de ayuda a WhatsApp de soporte"
```

---

### Task 0.3: Corregir colores prohibidos en status badges del staff

**Files:**
- Modify: `app/portal/receptionist/dashboard/ReceptionistDashboard.tsx`

**Interfaces:**
- Produces: badges de staff con paleta brand/slate, con variante dark

**Context:** `staffStatusStyles` (líneas ~30–35) usa `bg-emerald-100 text-emerald-700` y `bg-amber-100 text-amber-700`. Ambos violan la paleta. Además no tienen variantes dark — en modo oscuro quedan ilegibles.

- [ ] **Step 1: Reemplazar `staffStatusStyles`**

En `app/portal/receptionist/dashboard/ReceptionistDashboard.tsx`, reemplazar el objeto `staffStatusStyles` (líneas 30–35):

```tsx
/* ANTES */
const staffStatusStyles: Record<string, string> = {
  Free: "bg-emerald-100 text-emerald-700",
  Busy: "bg-amber-100 text-amber-700",
  Break: "bg-slate-100 text-slate-500",
  Offline: "bg-slate-200 text-slate-600",
};

/* DESPUÉS */
const staffStatusStyles: Record<string, string> = {
  Free: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
  Busy: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300",
  Break: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400",
  Offline: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500",
};
```

- [ ] **Step 2: Verificar visualmente**

```bash
npm run dev
# Navegar a /portal/receptionist/dashboard
# Verificar que los badges de staff (sección "Equipo disponible") usan azul/slate
# Activar dark mode — verificar que los badges son legibles
```

- [ ] **Step 3: Commit**

```bash
git add app/portal/receptionist/dashboard/ReceptionistDashboard.tsx
git commit -m "fix(receptionist): reemplazar colores prohibidos emerald/amber en staff badges"
```

---

## Fase 1 — Shared Components

### Task 1.1: Logo SVG en Sidebar (reemplazar "DP" placeholder)

**Files:**
- Create: `public/icon.svg` (copiar desde `app/icon.svg`)
- Modify: `app/portal/components/layout/Sidebar.tsx`

**Interfaces:**
- Produces: Sidebar con logo SVG 32×32 en todos los portales (admin, receptionist, professional, client)

**Context:** La Sidebar muestra `"DP"` en texto dentro de un cuadro brand-teal. El SVG del diente está en `app/icon.svg` pero ese path solo sirve como favicon de Next.js. Hay que copiarlo a `public/` para usarlo como asset estático.

- [ ] **Step 1: Copiar icon.svg a public/**

```bash
cp app/icon.svg public/icon.svg
```

- [ ] **Step 2: Verificar que el asset es accesible**

```bash
npm run dev
# Abrir http://localhost:3000/icon.svg en el navegador
# Debe renderizar el SVG del diente
```

- [ ] **Step 3: Reemplazar el placeholder "DP" en Sidebar**

En `app/portal/components/layout/Sidebar.tsx`, reemplazar el bloque del logo (líneas ~64–72):

```tsx
/* ANTES */
<Link href="/" className="flex items-center gap-2">
  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal text-white shadow-glow">
    DP
  </span>
  <div>
    <p className="text-sm font-semibold text-slate-900 dark:text-white">{brandTitle}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400">{brandSubtitle}</p>
  </div>
</Link>

/* DESPUÉS */
<Link href="/" className="flex items-center gap-2">
  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-glow overflow-hidden">
    <img src="/icon.svg" alt="" aria-hidden="true" className="h-10 w-10" />
  </span>
  <div>
    <p className="text-sm font-semibold text-slate-900 dark:text-white">{brandTitle}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400">{brandSubtitle}</p>
  </div>
</Link>
```

- [ ] **Step 4: Verificar en todos los portales**

```bash
npm run dev
# Verificar /portal/receptionist/dashboard — logo SVG visible en sidebar
# Verificar /portal/admin — logo SVG visible
# Verificar /portal/professional/calendar — logo SVG visible
# Verificar /portal/client — logo SVG visible
```

- [ ] **Step 5: Commit**

```bash
git add public/icon.svg app/portal/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): reemplazar placeholder 'DP' con logo SVG del diente"
```

---

### Task 1.2: Crear componente StatusBadge

**Files:**
- Create: `app/portal/components/ui/StatusBadge.tsx`

**Interfaces:**
- Produces: `<StatusBadge status="Free" />` — variantes tipadas para estados de citas y staff
- Consumed by: Task 2.1 (ReceptionistDashboard), Task 5.1 (AppointmentsTable admin), Task 3.1 (professional)

```tsx
// Signature del componente
export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type StaffStatus = "Free" | "Busy" | "Break" | "Offline";

export type BadgeVariant = AppointmentStatus | StaffStatus;

export function StatusBadge({ status }: { status: BadgeVariant }): JSX.Element
```

- [ ] **Step 1: Crear el archivo**

Crear `app/portal/components/ui/StatusBadge.tsx`:

```tsx
const config: Record<
  string,
  { label: string; className: string }
> = {
  // Appointment statuses
  SCHEDULED:   { label: "Programada",    className: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300" },
  CONFIRMED:   { label: "Confirmada",    className: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan" },
  CHECKED_IN:  { label: "En consulta",   className: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan" },
  CANCELLED:   { label: "Cancelada",     className: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500" },
  COMPLETED:   { label: "Completada",    className: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan" },
  NO_SHOW:     { label: "No asistió",    className: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400" },
  // Staff statuses
  Free:        { label: "Disponible",    className: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan" },
  Busy:        { label: "Ocupado",       className: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300" },
  Break:       { label: "En pausa",      className: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400" },
  Offline:     { label: "Sin turno",     className: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500" },
};

export type BadgeVariant = keyof typeof config;

export function StatusBadge({ status }: { status: string }) {
  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-slate-400",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Verificar tipado**

```bash
npx tsc --noEmit
# Espera: 0 errores en StatusBadge.tsx
```

- [ ] **Step 3: Commit**

```bash
git add app/portal/components/ui/StatusBadge.tsx
git commit -m "feat(portal/ui): añadir StatusBadge con paleta brand aprobada y dark mode"
```

---

### Task 1.3: Añadir NotificationsBell al portal paciente (ClientPortalShell)

**Files:**
- Modify: `app/portal/client/components/ClientPortalShell.tsx`

**Interfaces:**
- Consumes: `NotificationsBell` de `app/portal/receptionist/components/NotificationsBell.tsx`
- Produces: bell funcional en el portal del paciente con dropdown de notificaciones

**Context:** `ClientPortalShell` pasa a `Topbar` un prop `extra` (botón "Agendar cita") pero no pasa `notificationsSlot`. El `Topbar` genérico soporta `notificationsSlot?: ReactNode` — solo hay que pasarle el `NotificationsBell` existente. El componente ya es production-ready (cursor pagination, mark-as-read, dark mode, keyboard Escape).

- [ ] **Step 1: Añadir import de NotificationsBell**

En `app/portal/client/components/ClientPortalShell.tsx`, añadir import después de los existentes:

```tsx
import { NotificationsBell } from "@/app/portal/receptionist/components/NotificationsBell";
```

- [ ] **Step 2: Pasar notificationsSlot al Topbar**

En el mismo archivo, en el JSX del `<Topbar>`, añadir el prop `notificationsSlot`:

```tsx
/* ANTES */
<Topbar
  roleLabel="Paciente"
  userName={userName}
  onMenuClick={() => setIsSidebarOpen(true)}
  title="Portal Paciente"
  subtitle={clinic.city ?? "Panel de control"}
  extra={
    <Link
      href="/portal/client/book"
      className={buttonClasses({ variant: "primary", size: "sm" })}
      aria-label="Agendar una cita"
      title="Agendar una cita"
    >
      Agendar cita
    </Link>
  }
/>

/* DESPUÉS */
<Topbar
  roleLabel="Paciente"
  userName={userName}
  onMenuClick={() => setIsSidebarOpen(true)}
  title="Portal Paciente"
  subtitle={clinic.city ?? "Panel de control"}
  notificationsSlot={<NotificationsBell />}
  extra={
    <Link
      href="/portal/client/book"
      className={buttonClasses({ variant: "primary", size: "sm" })}
      aria-label="Agendar una cita"
      title="Agendar una cita"
    >
      Agendar cita
    </Link>
  }
/>
```

- [ ] **Step 3: Verificar visualmente**

```bash
npm run dev
# Iniciar sesión como paciente
# El topbar debe mostrar la campana con badge de notificaciones
# Hacer click → debe abrir el dropdown de notificaciones
# Escape → debe cerrar el dropdown
```

- [ ] **Step 4: Commit**

```bash
git add app/portal/client/components/ClientPortalShell.tsx
git commit -m "feat(client): conectar NotificationsBell al portal paciente"
```

---

### Task 1.4: Renderizado condicional de welcome card en ClientPortalShell

**Files:**
- Modify: `app/portal/client/components/ClientPortalShell.tsx`

**Interfaces:**
- Produces: welcome card solo visible en `/portal/client` exacto, no en subrutas

**Context:** La `<Card>` con avatar/nombre/patientCode se renderiza en TODAS las páginas del portal paciente porque está en el `<main>` antes de `{children}`. En páginas como consentimientos o historial ocupa espacio sin aportar.

- [ ] **Step 1: Hacer la card condicional**

En `app/portal/client/components/ClientPortalShell.tsx`, el hook `usePathname()` ya está importado. Añadir la condición:

```tsx
/* ANTES */
<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
  {patient?.needsOnboarding && pathname !== "/portal/client/onboarding" ? (
    /* ... banner onboarding ... */
  ) : null}
  <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    {/* ... welcome card ... */}
  </Card>
  {children}
</div>

/* DESPUÉS */
<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
  {patient?.needsOnboarding && pathname !== "/portal/client/onboarding" ? (
    /* ... banner onboarding ... */
  ) : null}
  {pathname === "/portal/client" ? (
    <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* ... welcome card — sin cambios internos ... */}
    </Card>
  ) : null}
  {children}
</div>
```

El bloque completo de la `<Card>` (líneas ~126–144) queda intacto internamente — solo se envuelve en la condición `pathname === "/portal/client"`.

- [ ] **Step 2: Verificar comportamiento**

```bash
npm run dev
# Iniciar sesión como paciente
# /portal/client → welcome card visible ✓
# /portal/client/appointments → sin welcome card, solo el contenido ✓
# /portal/client/consents → sin welcome card ✓
# /portal/client/treatment-history → sin welcome card ✓
# Banner de onboarding sigue apareciendo si aplica ✓
```

- [ ] **Step 3: Commit**

```bash
git add app/portal/client/components/ClientPortalShell.tsx
git commit -m "fix(client): mostrar welcome card solo en /portal/client, no en subrutas"
```

---

## Fase 2 — RECEPCIONISTA

### Task 2.1: Usar StatusBadge en ReceptionistDashboard (staff list)

**Files:**
- Modify: `app/portal/receptionist/dashboard/ReceptionistDashboard.tsx`

**Interfaces:**
- Consumes: `StatusBadge` de Task 1.2
- Produces: badges de staff usando el componente unificado; eliminar `staffStatusStyles` y `staffStatusLabels` hardcodeados

- [ ] **Step 1: Añadir import**

En `app/portal/receptionist/dashboard/ReceptionistDashboard.tsx`, añadir:

```tsx
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";
```

- [ ] **Step 2: Reemplazar badges hardcodeados**

Localizar el bloque del staff card (línea ~292–300). Reemplazar el `<span>` con clase dinámica:

```tsx
/* ANTES */
<span
  className={`rounded-full px-3 py-1 text-xs font-semibold ${
    staffStatusStyles[staff.status] ?? "bg-slate-200 text-slate-600"
  }`}
>
  {staffStatusLabels[staff.status] ?? staff.status}
</span>

/* DESPUÉS */
<StatusBadge status={staff.status} />
```

- [ ] **Step 3: Eliminar los objetos hardcodeados ya sin uso**

Eliminar `staffStatusLabels` (líneas ~23–28) y `staffStatusStyles` (líneas ~30–35) del archivo, ya que `StatusBadge` los encapsula internamente.

- [ ] **Step 4: Verificar tipado y visual**

```bash
npx tsc --noEmit
npm run dev
# /portal/receptionist/dashboard → sección "Equipo disponible"
# Los badges deben verse con azul/slate (no verde ni amber)
# Activar dark mode — badges legibles
```

- [ ] **Step 5: Commit**

```bash
git add app/portal/receptionist/dashboard/ReceptionistDashboard.tsx
git commit -m "refactor(receptionist): usar StatusBadge compartido en lista de staff"
```

---

### Task 2.2: Auditar AppointmentTable — verificar acciones de fila

**Files:**
- Read: `app/portal/receptionist/components/AppointmentTable.tsx`
- Modify: `app/portal/receptionist/components/AppointmentTable.tsx` (si hay botones decorativos)

**Interfaces:**
- Produces: cada acción de fila en la tabla de citas tiene handler real o se elimina

- [ ] **Step 1: Leer el archivo completo**

```bash
cat app/portal/receptionist/components/AppointmentTable.tsx
```

Identificar todos los elementos `<button>` o `<a>` y verificar que tienen `onClick` o `href` funcionales. Los que no tengan deben eliminarse.

- [ ] **Step 2: Para cada status en la tabla, usar StatusBadge**

Buscar dónde se renderiza el status de la cita en la tabla. Reemplazar con `<StatusBadge status={appointment.status} />`.

Añadir import:
```tsx
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";
```

- [ ] **Step 3: Verificar y commit**

```bash
npx tsc --noEmit
npm run dev
# /portal/receptionist/dashboard → tabla de citas
# Status badges correctos
# Todas las acciones de fila tienen función real

git add app/portal/receptionist/components/AppointmentTable.tsx
git commit -m "refactor(receptionist): usar StatusBadge en tabla de citas"
```

---

## Fase 3 — PROFESIONAL

### Task 3.1: Limpiar console.error en ProfessionalTopbar

**Files:**
- Modify: `app/portal/professional/components/ProfessionalTopbar.tsx`

**Interfaces:**
- Produces: ProfessionalTopbar sin `console.error` — usa `logger` de `@/lib/logger`

**Context:** `ProfessionalTopbar` tiene dos bloques `catch (error) { console.error(error) }` — deben usar `logger.error` para consistencia con el resto del portal. Las notificaciones del profesional son funcionales (usa `/api/professional/notifications`) — no las tocamos.

- [ ] **Step 1: Añadir import del logger**

En `app/portal/professional/components/ProfessionalTopbar.tsx`:

```tsx
import { logger } from "@/lib/logger";
```

- [ ] **Step 2: Reemplazar console.error**

```tsx
/* ANTES (búsqueda/fetch de notificaciones, línea ~66) */
} catch (error) {
  console.error(error);
}

/* DESPUÉS */
} catch (error) {
  logger.error({ error }, "Professional notifications fetch failed");
}

/* ANTES (búsqueda/search, línea ~92) */
if ((error as Error).name !== "AbortError") {
  console.error(error);
}

/* DESPUÉS */
if ((error as Error).name !== "AbortError") {
  logger.error({ error }, "Professional search failed");
}
```

- [ ] **Step 3: Verificar tipado y commit**

```bash
npx tsc --noEmit
git add app/portal/professional/components/ProfessionalTopbar.tsx
git commit -m "fix(professional): reemplazar console.error con logger en ProfessionalTopbar"
```

---

### Task 3.2: Usar StatusBadge en AppointmentTable del profesional

**Files:**
- Read: `app/portal/professional/` (buscar dónde se renderizan status de citas)
- Modify: archivo correspondiente

**Interfaces:**
- Consumes: `StatusBadge` de Task 1.2
- Produces: status de citas del profesional con paleta unificada

- [ ] **Step 1: Identificar el componente**

```bash
grep -r "SCHEDULED\|CONFIRMED\|CANCELLED\|status" app/portal/professional/ --include="*.tsx" -l
```

- [ ] **Step 2: Para cada archivo encontrado**

Añadir import:
```tsx
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";
```

Reemplazar cualquier badge de status hardcodeado con `<StatusBadge status={appointment.status} />`.

- [ ] **Step 3: Verificar y commit**

```bash
npx tsc --noEmit
git add app/portal/professional/
git commit -m "refactor(professional): usar StatusBadge en vistas del profesional"
```

---

## Fase 4 — PACIENTE

### Task 4.1: Auditar acciones en portal del paciente

**Files:**
- Read: `app/portal/client/appointments/page.tsx`, `app/portal/client/consents/page.tsx`, `app/portal/client/treatment-history/page.tsx`

**Interfaces:**
- Produces: cada botón en el portal paciente tiene función real o se elimina

- [ ] **Step 1: Leer y auditar cada página**

```bash
cat app/portal/client/appointments/page.tsx
cat app/portal/client/consents/page.tsx
cat app/portal/client/treatment-history/page.tsx
```

Para cada `<button>` o `<a>` sin `onClick`/`href` real: eliminar o conectar.

- [ ] **Step 2: Usar StatusBadge en la lista de citas del paciente**

Buscar donde se renderiza el status de las citas del paciente. Reemplazar con `<StatusBadge status={appointment.status} />`.

- [ ] **Step 3: Verificar y commit**

```bash
npx tsc --noEmit
npm run dev
# Iniciar sesión como paciente
# /portal/client/appointments → status badges correctos, acciones funcionales
git add app/portal/client/
git commit -m "refactor(client): usar StatusBadge y auditar acciones en portal paciente"
```

---

## Fase 5 — ADMINISTRADOR

### Task 5.1: Usar StatusBadge en AppointmentsTable del admin

**Files:**
- Modify: `app/portal/admin/_components/AppointmentsTable.tsx`

**Interfaces:**
- Consumes: `StatusBadge` de Task 1.2
- Produces: tabla de citas del admin con paleta unificada

- [ ] **Step 1: Leer el archivo**

```bash
cat app/portal/admin/_components/AppointmentsTable.tsx
```

- [ ] **Step 2: Añadir import y reemplazar badges**

```tsx
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";
```

Reemplazar cualquier renderizado de status de cita con `<StatusBadge status={appointment.status} />`.

- [ ] **Step 3: Verificar y commit**

```bash
npx tsc --noEmit
npm run dev
# /portal/admin → tabla de citas con StatusBadge
git add app/portal/admin/_components/AppointmentsTable.tsx
git commit -m "refactor(admin): usar StatusBadge en tabla de citas del administrador"
```

---

### Task 5.2: Añadir campo delta a KPIStatCard

**Files:**
- Modify: `app/portal/admin/_components/KPIStatCard.tsx`
- Modify: `app/portal/admin/page.tsx`

**Interfaces:**
- Produces: KPIs muestran tendencia opcional (δ% vs período anterior) cuando se provee

- [ ] **Step 1: Leer KPIStatCard actual**

```bash
cat app/portal/admin/_components/KPIStatCard.tsx
```

- [ ] **Step 2: Añadir prop `delta` opcional**

Ejemplo de modificación:

```tsx
interface KPIStatCardProps {
  label: string;
  value: string;
  change: string;
  testId?: string;
  delta?: number | null;  // porcentaje: positivo = sube, negativo = baja
}

export function KPIStatCard({ label, value, change, testId, delta }: KPIStatCardProps) {
  return (
    <div data-testid={testId} className="...">
      {/* ... contenido existente ... */}
      {delta != null ? (
        <span className={`text-xs font-semibold ${delta >= 0 ? "text-brand-teal dark:text-accent-cyan" : "text-slate-500 dark:text-slate-400"}`}>
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
        </span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Verificar que admin/page.tsx sigue siendo compatible**

La prop `delta` es opcional — `admin/page.tsx` no necesita cambiar. Verificar tipado:

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/portal/admin/_components/KPIStatCard.tsx
git commit -m "feat(admin): añadir prop delta opcional a KPIStatCard"
```

---

## Verificación Final

### Task F.1: Build de producción limpio

- [ ] **Step 1: Build completo**

```bash
npm run build
# Espera: ✓ Compiled successfully
# Espera: 0 errors, 0 warnings relevantes
```

- [ ] **Step 2: Lint**

```bash
npm run lint
# Espera: 0 errors
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
# Espera: 0 errors
```

---

### Task F.2: E2E smoke por rol

- [ ] **Step 1: Login RECEPCIONISTA**

```bash
npx playwright test tests/ --grep "@smoke" --headed
# Si no hay tag @smoke, correr el test de login existente:
# npx playwright test tests/authenticate-user.spec.ts --headed
```

- [ ] **Step 2: Verificar dashboards manualmente**

Acceder con cada rol y verificar:
- PACIENTE: campana funcional, welcome card solo en `/portal/client`
- RECEPCIONISTA: staff badges en azul/slate, sin verde ni amber
- PROFESIONAL: notificaciones sin crash
- ADMINISTRADOR: tabla de citas con StatusBadge

- [ ] **Step 3: Verificar dark mode**

En cada portal: activar dark mode con el toggle. Verificar que los badges de status son legibles.
