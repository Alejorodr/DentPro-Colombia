# DentPro Colombia — Claude Code Context

Este repositorio es la plataforma de **DentPro Colombia**, una clínica dental especializada en Chía, Cundinamarca. Stack: **Next.js App Router + Tailwind v4 + Phosphor Icons + NextAuth**.

> Lee también: `design-system/README.md` para guías de marca completas, `design-system/SKILL.md` para instrucciones de uso del sistema de diseño, y `design-system/colors_and_type.css` para todos los tokens visuales.

---

## Arquitectura del proyecto

```
app/
├── (marketing)/          # Sitio público — landing, servicios, especialistas, booking
│   ├── components/       # Hero, Navbar, Services, Specialists, BookingForm, Contact
│   └── page.tsx          # Entry point del marketing site
├── portal/               # Portal clínico multi-rol
│   ├── paciente/         # Vista paciente — citas, historial, consentimientos
│   ├── profesional/      # Agenda, fichas clínicas, recetas, resultados
│   ├── recepcion/        # Dashboard, turnos, gestión de pacientes, facturación
│   └── admin/            # KPIs, ingresos, staff, servicios, CMS, auditoría
├── api/                  # Rutas API — auth, citas, pacientes, etc.
├── globals.css           # Tokens Tailwind v4 — colores, sombras, radios, gradientes
└── icon.svg              # Favicon (diente SVG)

components/
└── ui/
    └── Icon.tsx          # Barrel de Phosphor Icons — SIEMPRE importar desde aquí

lib/
├── marketing/            # Defaults del homepage, datos de servicios y especialistas
└── portal/               # Lógica de roles, auth helpers

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
| Framework | Next.js 15 App Router |
| Estilos | Tailwind CSS v4 |
| Iconos | Phosphor Icons (`@phosphor-icons/react`) |
| Auth | NextAuth (Credentials provider) |
| Idioma | Español (Colombia), `lang="es"`, `locale="es_CO"` |
| Fuentes | Outfit (headings), Inter (body) |

---

## Reglas de diseño — NUNCA violar

### Colores
- Paleta azul-doble: `#031536` midnight → `#0a3d91` brand-teal → `#1f6cd3` brand-indigo → `#4cc3f1` brand-sky → `#5bd0ff` accent-cyan → `#e6f4ff` brand-light.
- **Sin verdes, sin morados, sin cálidos**. Solo slate para neutros.
- Dorado (`#c8901f`) solo en logos impresos, nunca en UI.

### Componentes
- **Tarjeta signature**: `rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/10 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`
- **Botón primario**: gradiente brand, sombra glow, hover lift `-translate-y-0.5`, sin cambio de color en hover.
- **Único panel full-gradient**: el formulario de agendamiento. Todo lo demás es blanco o `bg-brand-light`.
- **Navbar**: `bg-white/80 backdrop-blur-lg` — frosted glass.

### Iconos
- **Siempre** desde `@/components/ui/Icon.tsx`, nunca import directo.
- `weight="bold"` para UI general, `weight="fill"` para estados/status.
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
- Portal: navegación en inglés (`Dashboard`, `Staff Management`), contenido en español.

### Moneda y fechas
- Precios: `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" })` — sin decimales: `$1.250.000`.
- Fechas: `Lun–Sáb 8:00–19:00`, `Sáb 14 dic · 9:00 a. m.`
- Teléfono: `+57 323 796 8435`

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
npm run dev

# Build
npm run build

# Lint
npm run lint
```

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
3. Labels de navegación en inglés, contenido de la página en español.

**Modificas el marketing site:**
1. Referencia `design-system/ui_kits/marketing/` para estructura.
2. Mantén los datos por defecto en `lib/marketing/homepage-defaults.ts`.
3. CTA principal siempre `Agenda tu cita` o `Ver disponibilidad`.
