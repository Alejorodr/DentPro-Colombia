# DentPro Colombia — Claude Code Context

Este repositorio es la plataforma de **DentPro Colombia**, una clínica dental especializada en Chía, Cundinamarca. Stack: **Next.js App Router + Tailwind v4 + AnimateIcons/Lucide + NextAuth**.

> Lee también: `design-system/README.md` para guías de marca completas, `design-system/SKILL.md` para instrucciones de uso del sistema de diseño, y `design-system/colors_and_type.css` para todos los tokens visuales.

---

## Arquitectura del proyecto

```
app/
├── (marketing)/          # Sitio público — landing, servicios, especialistas, booking
│   ├── components/       # Hero, Navbar, Services, Specialists, BookingForm, Contact
│   └── page.tsx          # Entry point del marketing site
├── portal/               # Portal clínico multi-rol
│   ├── client/           # Vista paciente — citas, historial, consentimientos
│   ├── professional/     # Agenda, fichas clínicas, recetas, resultados
│   ├── receptionist/     # Dashboard, turnos, gestión de pacientes, facturación
│   └── admin/            # KPIs, ingresos, staff, servicios, CMS, auditoría
├── api/                  # Rutas API — auth, citas, pacientes, etc.
├── globals.css           # Tokens Tailwind v4 — colores, sombras, radios, gradientes
└── icon.svg              # Favicon (diente SVG)

components/
└── ui/
    └── Icon.tsx          # Barrel semántico AnimateIcons/Lucide — SIEMPRE importar desde aquí

lib/
├── marketing/            # Defaults del homepage, datos de servicios y especialistas
├── auth/                 # Roles, sesión, credenciales y guardas de auth
└── portal/               # Datos del dashboard del paciente

design-system/            # Sistema de diseño exportado desde Claude Design
├── README.md             # Guías de marca, voz, color, tipografía, iconografía
├── SKILL.md              # Skill front-matter para agentes
├── colors_and_type.css   # Tokens CSS — drop-in para cualquier HTML/JSX
├── assets/               # Logos, foto del local, ícono SVG
├── ui_kits/marketing/    # Recreación JSX del sitio marketing
├── ui_kits/portal/       # Recreación JSX del portal multi-rol
└── preview/              # Cards HTML del design system
```

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 App Router (build con webpack) |
| Estilos | Tailwind CSS v4 |
| Iconos | AnimateIcons/Lucide (`@animateicons/react` + `lucide-react`) |
| Auth | NextAuth v5 (Credentials + Google) |
| Idioma | Español (Colombia), `lang="es"`, `locale="es_CO"` |
| Fuentes | Outfit (headings), Inter (body) |

---

## Reglas de diseño — NUNCA violar

### Colores
- Paleta azul-doble: `#031536` midnight → `#0a3d91` brand-teal → `#1f6cd3` brand-indigo → `#4cc3f1` brand-sky → `#5bd0ff` accent-cyan → `#e6f4ff` brand-light.
- **Sin verdes, sin morados, sin cálidos**. Solo slate para neutros.
- Dorado (`#c8901f`) solo en logos impresos, nunca en UI.
- **Excepción aprobada**: dorado `gold-bright` (`#e6b450`) para las estrellas de calificación de reseñas (hero, InfoBar) — pedido explícito del dueño en DOG-35; no usarlo en ningún otro elemento de UI.
- **Excepción aprobada**: rojo (`red-*`) para mensajes de error/validación (ej. login fallido) — no migrar a azul-marca, el rojo mantiene la urgencia visual del error.
- **Excepción aprobada**: verde/emerald (`emerald-*`/`green-*`) para mensajes de éxito en formularios — paralelo a la excepción de rojo-error, misma lógica (urgencia/confirmación visual, no decorativo).
- **Excepción aprobada**: rojo/rose para alertas clínicas de seguridad del paciente (ej. alergias críticas en `ProfessionalDashboard.tsx`) — la urgencia visual es intencional y no debe migrarse a azul-marca.
- **Excepción aprobada**: ámbar (`amber-*`) para banners informativos de advertencia (no error, no éxito — ej. "muéstrasela al usuario ahora", perfil incompleto, requisitos de contraseña, sin horarios disponibles) — categoría distinta de éxito/error, no migrar a azul-marca.
- **Excepción aprobada**: rojo/rose (`rose-*`) para botones de acción destructiva (ej. "Eliminar" con borrado permanente) — distinto de transiciones de estado normales (esas sí van en la paleta de marca, ver `StatusBadge`/`STATUS_COLORS`), el rojo aquí es convención UX estándar para irreversibilidad.

### Componentes
- **Tarjeta signature**: `rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/10 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`
- **Botón primario**: gradiente brand, sombra glow, hover lift `-translate-y-0.5`, sin cambio de color en hover.
- **Único panel full-gradient**: el formulario de agendamiento. Todo lo demás es blanco o `bg-brand-light`.
- **Navbar**: `bg-white/80 backdrop-blur-lg` — frosted glass.
- **Tarjeta portal** (`app/portal/components/ui/Card.tsx`): `rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs shadow-slate-100/60` — sin hover-lift, patrón deliberadamente distinto a la tarjeta signature (dashboard denso/tabular vs. marketing orientado a conversión). No convertir a signature card.

### Iconos
- **Siempre** desde `@/components/ui/Icon.tsx`, nunca import directo desde librerías de iconos.
- El wrapper mantiene compatibilidad con `weight`, pero la geometría visual objetivo es Lucide.
- Tamaños: 16px inline, 20px botones/nav, 24px servicios/floating.
- Contenedores: `icon-badge` (40px) o `icon-circle` (56px) — definidos en `globals.css`.

### Tipografía
- **Outfit** para display/headings. **Inter** para body.
- Sentence case en todo. Title Case nunca.
- Eyebrows: 12px semibold uppercase tracked (ej: `EQUIPO CLÍNICO`).

### Voz (español Colombia)
- **Tú-form siempre**, nunca usted.
- CTAs = verbos: `Agenda tu cita`, `Ver disponibilidad`, `Reservar turno`.
- Sin emoji nunca. Sin signos de exclamación excepto en mensajes de éxito (máx 1 por página).
- Portal: todo en español, navegación incluida (`Inicio`, `Agenda`, `Pacientes`). Los cuatro roles comparten el shell glassy (`PortalGlassShell`).

### Moneda y fechas
- Precios: `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" })` — sin decimales: `$1.250.000`.
- Fechas: `Lun–Sáb 8:00–19:00`, `Sáb 14 dic · 9:00 a. m.`
- Teléfono: `+57 323 796 8435`
- Zona horaria: todo instante (citas, registros, notificaciones) se formatea con `timeZone: CLINIC_TIME_ZONE` (`America/Bogota`, en `lib/dates/tz.ts`). El servidor de Vercel corre en UTC: sin la zona, las horas salen 5 horas corridas. Solo los días de calendario armados en el navegador (selectores de fecha) van sin zona.

### Soporte de navegadores y plataforma web (DOG-40)
- **Baseline amplio** sin fallbacks. Funciones **Baseline nuevas o aún no Baseline**: solo con detección y degradación elegante, siguiendo el fallback de la guía de `modern-web-guidance`. No se agregan polyfills ni dependencias si existe una solución nativa.
- **Modales**: siempre `PortalDialog` (`app/portal/components/ui/PortalDialog.tsx`), que usa `<dialog>` nativo con `showModal()`. Nada de overlays `fixed inset-0` hechos a mano, `role="dialog"`, `aria-modal` ni trampas de foco manuales. Clic afuera para cerrar (`dismissible`) solo en diálogos de lectura o confirmación, nunca en formularios.
- **Formularios**: cada campo con `<label>` asociado y `autocomplete` correcto (`username` + `current-password` en login, `new-password` al crear o cambiar contraseña, `one-time-code` en códigos). Un Enter manejado a mano chequea `isComposing` (IME).

---

## Roles del portal

| Rol | Acceso |
|---|---|
| `PACIENTE` | Citas próximas, historial clínico, consentimientos, perfil |
| `PROFESIONAL` | Agenda diaria, fichas de pacientes, recetas, resultados de laboratorio |
| `RECEPCIONISTA` | Dashboard, turnos, gestión pacientes, facturación, staff |
| `ADMINISTRADOR` | KPIs, ingresos, staff/servicios/CMS, logs de auditoría |

---

## Comandos frecuentes

```bash
# Desarrollo
pnpm dev

# Verificación local completa (antes de integrar un ticket a develop)
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# E2E locales contra Postgres efímero en Docker (aislado de .env.local)
pnpm e2e:local:smoke          # @smoke, igual al CI de PR
pnpm e2e:local                # suite completa, igual al Nightly
pnpm e2e:local -- e2e/auth.spec.ts --repeat-each=3   # un spec puntual
pnpm e2e:db:down              # bajar el contenedor

# Escaneo de secretos con gitleaks en Docker (igual al workflow Secret Scan)
pnpm secrets:scan             # todo el historial
pnpm secrets:scan -- staged   # solo lo preparado para commit
```

---

## Flujo de trabajo: tickets, develop y releases

- **Tickets en Linear.** Cada trabajo nace de un ticket (`DOG-123`, proyecto "DentPro Colombia" en el workspace DOGBYTE de Linear).
- **`main`** = última versión publicada y estable (lo que está en producción). Solo recibe releases.
- **`develop`** = versión local más nueva: acumula los tickets terminados y probados. Se sube a GitHub **solo como respaldo** (no dispara CI). Vercel crea un preview de cada push a `develop`, conectado a la rama Dev de Neon (DOG-7).
- **Por ticket:** rama corta desde `develop` (`feat/DOG-123-descripcion`, `fix/DOG-124-...`), verificación local completa (lint, typecheck, test, build y E2E si toca flujos), changeset (`pnpm changeset`) y merge a `develop` en local.
- **Estados en Linear (DOG-59):** `Todo → In Progress → En develop → Done`. **En develop** = integrado y verificado en local, todavía no en producción. **Done** = en `main`, desplegado y verificado en producción. Un ticket nunca pasa a Done por estar solo en `develop`.
- **Sección "Para producción" en cada ticket:** se escribe al pasar a En develop. Incluye migraciones, variables nuevas, riesgos, datos a cargar y qué probar en producción, o "Sin pasos especiales" si no aplica. No se abre un segundo ticket por cambio.
- **Ticket del release:** lista los tickets que entran, junta sus secciones "Para producción" en un solo checklist, y cuelga como sub-tickets cada fallo, desvío o alerta del release, el CI de `main` o el deploy. Cuando la verificación en producción pasa, sus tickets van de En develop a Done y después se cierra el release. Si hay trabajo propio en producción (script sobre la base, carga de datos, recurso con costo), va en un sub-ticket aparte, con responsable.
- **Todo fallo lleva ticket:** cualquier fallo, desvío o alerta (CI, deploy, producción, scripts, CodeQL, Dependabot) se documenta en Linear al detectarlo, aunque se arregle enseguida. No se cierra hasta verificar el arreglo donde falló. La etiqueta **`Producción`** marca lo que afecta o puede afectar a usuarios reales.
- **Saneamiento (DOG-61):** todo archivo, documento, export, dependencia o línea sin uso que se detecte lleva un ticket con la etiqueta `Chore`, aunque se arregle en el momento. Va un ticket por detección (una corrida de knip o la revisión de un módulo), no uno por archivo. El ticket lleva una tabla con la decisión de cada hallazgo y su motivo: **Eliminar**, **Corregir** o **Conservar** (los falsos positivos se ignoran en `knip.jsonc` con un comentario). Si un hallazgo resulta ser un bug, va en un ticket aparte. Antes de cada release se corre `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/dentpro_e2e pnpm dlx knip@5` sobre `develop`.
- **Release:** solo con aprobación explícita del dueño. Un único PR `develop` → `main`, CI verde y merge con **merge commit, nunca squash** (DOG-51: el squash separa las historias y hace reaparecer changesets ya publicados). Después, el PR `chore(release): version packages` (también con merge commit) y el workflow crea la etiqueta `vX.Y.Z`. Por último, `main` se trae a `develop` (`git merge origin/main`). El PR menciona el ticket del release solo en el cuerpo (`Refs DOG-123`), no en el título, para que la integración con GitHub no lo cierre al mergear (DOG-55). Paso a paso en `docs/RELEASES.md`.
- **Hotfix urgente de producción:** rama desde `main`, PR directo a `main`, y luego merge de `main` en `develop`.
- **Dependabot:** mensual y agrupado; sus PRs se unifican en el siguiente release. Las alertas de seguridad se atienden aparte.
- **Base local:** `.env.local` apunta a la branch **Dev** de Neon (base `neondb`; la shadow de Prisma es `prisma_shadow` en la misma branch). Nunca a producción: las URLs de producción viven fuera del repo, en `~/.dentpro/prod.env`, y solo se usan en los pasos del release (DOG-41).
- Nunca correr E2E contra Neon (prod ni dev): siembran usuarios con contraseñas públicas. Usar `pnpm e2e:local`.

---

## Servicios de la clínica (fuente: lib/marketing/homepage-defaults.ts)

1. Limpieza y profilaxis
2. Ortodoncia digital (alineadores invisibles, brackets autoligables)
3. Implantes y cirugía (cirugía guiada)
4. Estética dental (carillas, blanqueamiento, diseño de sonrisa)
5. Endodoncia avanzada (con microscopio)
6. Odontopediatría

**Sede**: Cra. 7 #13-180, Chía, Cundinamarca · **WhatsApp**: +57 323 796 8435  
**Horario**: Lun–Sáb 8:00–19:00 · Domingos y festivos con cita previa

---

## Qué hacer cuando...

**Creas un nuevo componente de UI:**
1. Lee `design-system/colors_and_type.css` para los tokens exactos.
2. Lee el componente más cercano en `design-system/ui_kits/` como referencia.
3. Importa iconos desde `@/components/ui/Icon.tsx`.
4. Aplica la tarjeta signature y reglas de hover definidas arriba.

**Añades una pantalla al portal:**
1. Revisa `design-system/ui_kits/portal/RoleViews.jsx` para el patrón de layout.
2. Protege la ruta según el rol correspondiente en NextAuth.
3. Labels de navegación y contenido en español; la página se monta dentro de `PortalGlassShell`.

**Modificas el marketing site:**
1. Referencia `design-system/ui_kits/marketing/` para estructura.
2. Mantén los datos por defecto en `lib/marketing/homepage-defaults.ts`.
3. CTA principal siempre `Agenda tu cita` o `Ver disponibilidad`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
