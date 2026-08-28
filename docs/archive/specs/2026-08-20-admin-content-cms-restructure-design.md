# Admin Content CMS Restructure — Design

## Context

Continuación directa de dos documentos previos:

- `docs/archive/specs/2026-08-19-homepage-content-audit.md` — mapa completo de la home pública contra la cobertura del CMS.
- `docs/archive/specs/2026-08-19-admin-content-cms-audit.md` — auditoría del lado admin de `/portal/admin/content`: encontró que el sidebar muestra 22 entradas pero solo hay 13 componentes editables reales (10 entradas son deep-links a un mismo formulario gigante de 46 campos), dos casos de duplicación de datos a nivel de entidad (Especialistas/Servicios de marketing vs. registros operacionales reales), toggles de visibilidad huérfanos, y varias inconsistencias menores de nombrado/UI.
- `docs/archive/specs/2026-08-19-company-info-channels-unification-design.md` — diseño ya aprobado (no se re-implementa acá, se referencia): unifica WhatsApp/Teléfono/Email/redes sociales en modelos con control de visibilidad por ubicación, agrupados en una nueva sección "Información de empresa".

Este documento cubre lo que falta para completar la simplificación del CMS: las dos fusiones de entidades duplicadas, partir el formulario gigante en paneles reales, y los arreglos menores encontrados en la auditoría.

## Alcance

**Dentro de este diseño:**
1. Fusión de "Especialistas" (marketing) con `ProfessionalProfile`/Staff (real) — una sola fuente de verdad.
2. Fusión de "Catálogo de servicios" (marketing) con `Service` (clínico) — aditiva, sin tocar nada del flujo de citas/agenda.
3. Partir `AdminHomepageSettingsPanel` (46 campos, 1 guardado) en paneles independientes, uno por sección de la home, cada uno con guardado propio.
4. Reorganización final del sidebar de Content resultante de 1-3, sumada a la reorganización ya aprobada en el diseño de canales/información de empresa.
5. Arreglos menores: renombre de "Canales de soporte" (choca con "Canales de comunicación"), traducción de labels en inglés sueltos, preview visual en selectores de ícono.

**Fuera de alcance (ya decidido en el diseño anterior o explícitamente diferido):**
- Todo lo ya cubierto por `2026-08-19-company-info-channels-unification-design.md` (canales, redes sociales, Información de empresa) — se da por aprobado e implementado aparte.
- Los bugs de contenido muerto (`Hero.tsx` badge/highlight, `BookingForm.tsx` selectLabel/options/consentNote, `services.badge`) — quedan para otra pasada, no se arreglan acá aunque los campos de Hero/Agenda se toquen al partir el formulario (se migran tal cual están, con el mismo bug, sin arreglarlo de rebote).
- El panel de Campañas mantiene su patrón de tabla+modal (outlier de UI) — no se estandariza al patrón de tarjetas en este diseño, es un cambio cosmético de bajo impacto que no vale la pena mezclar con esta reestructuración.
- Soporte multi-sede real — sigue fuera de alcance (ya decidido en el diseño anterior).

## A. Fusión Especialistas → Staff/ProfessionalProfile

### Modelo de datos

`HomepageSpecialist` (y su tabla) se elimina. `ProfessionalProfile` gana columnas nuevas, todas opcionales/con default — no se toca ninguna columna ni relación existente (`userId`, `specialtyId`, `slotDurationMinutes`, `active`, relaciones a `ProfessionalService`/horarios/citas quedan intactas):

```prisma
model ProfessionalProfile {
  // ... campos existentes sin cambios ...
  homepageBioShort   String?
  homepageImageUrl   String?
  homepageImageAlt   String?
  showOnHomepage     Boolean  @default(false)
  homepageSortOrder  Int      @default(0)
}
```

`showOnHomepage` arranca en `false` para todos los profesionales existentes tras la migración — nadie aparece automáticamente hasta que un admin lo active explícitamente (evita que perfiles incompletos, sin foto/bio, aparezcan en la home el día del deploy).

### Migración de datos

Script que, para cada `HomepageSpecialist` activo hoy, intenta encontrar el `ProfessionalProfile` correspondiente por coincidencia de nombre (`fullName` vs `User.name + " " + User.lastName`) y, si encuentra una coincidencia clara, copia `bioShort`→`homepageBioShort`, `imageUrl`→`homepageImageUrl`, `altText`→`homepageImageAlt`, `sortOrder`→`homepageSortOrder`, y setea `showOnHomepage = true`. Los `HomepageSpecialist` que no tengan coincidencia clara (nombre no matchea ningún profesional real) se listan en el reporte de migración para revisión manual — no se descartan en silencio, tampoco se inventa una coincidencia dudosa.

### UI admin

No se crea ningún panel nuevo en `/portal/admin/content`. El formulario de edición de profesional ya existente en `admin/staff` (`AdminProfessionalsPanel`/`AdminUsersPanel` vía el flujo de "Cambiar rol" ya construido en el trabajo anterior de este mismo proyecto) gana una sección nueva: "Presencia en el sitio público" — toggle `showOnHomepage`, campo de foto (reusa `AdminImageField`, mismo componente que ya usan Settings/Campaigns), bio corta, y control de orden.

### Consumo público

`SpecialistsSlider.tsx` deja de recibir `specialists[]` armado desde `HomepageSpecialist` vía `lib/marketing/homepage.ts` — pasa a leer `ProfessionalProfile` (join con `User` para nombre, join con `Specialty` para el texto de especialidad) filtrado por `showOnHomepage=true` y `active=true`, ordenado por `homepageSortOrder`.

## B. Fusión Servicios → Service clínico

### Modelo de datos

`HomepageService`/`HomepageServiceHighlight` se eliminan. `Service` gana columnas nuevas, todas opcionales/con default — **cero cambios** a `priceCents`, `durationMinutes`, `specialtyId`, ni a la relación con `ProfessionalService`/`Appointment`:

```prisma
model Service {
  // ... campos existentes sin cambios ...
  iconKey            String?
  showOnHomepage     Boolean               @default(false)
  homepageSortOrder  Int                   @default(0)
  homepageHighlights ServiceHighlight[]
}

model ServiceHighlight {
  id         String   @id @default(uuid())
  serviceId  String
  service    Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  text       String
  sortOrder  Int      @default(0)

  @@index([serviceId, sortOrder])
}
```

Mismo criterio que Especialistas: `showOnHomepage` arranca en `false` para todo `Service` existente, nada aparece en la home hasta que un admin lo active.

### Migración de datos

Script que, para cada `HomepageService` activo hoy, busca el `Service` clínico correspondiente — reutiliza la misma lógica de matching que ya usa el botón "Importar" existente (`AdminHomepageServicesPanel.tsx:296-328`, por nombre). Si encuentra coincidencia: copia `iconKey`, migra `highlights[]` a `ServiceHighlight`, `sortOrder`→`homepageSortOrder`, setea `showOnHomepage=true`. Sin coincidencia: se reporta para revisión manual, igual que Especialistas.

### UI admin

El formulario de `admin/services` (donde ya se gestiona precio/duración/especialidad) gana una sección "Presencia en el sitio público": toggle `showOnHomepage`, selector de ícono (con preview visual, ver sección E), lista de highlights (CRUD chico anidado, mismo patrón que ya existe hoy dentro de `AdminHomepageServicesPanel.tsx`, solo que ahora vive acá), y orden.

### Consumo público

`ServicesSection.tsx` pasa a leer `Service` filtrado por `showOnHomepage=true` y `active=true`, con `homepageHighlights` incluidos, ordenado por `homepageSortOrder`. El `SERVICE_HREFS` hardcodeado (mapa título→ruta, ya señalado como frágil en el audit) puede simplificarse a usar el `id` del `Service` en vez de matchear por string de título — mejora incidental, no bloqueante para este diseño, se decide en el plan de implementación.

## C. Partir el formulario gigante en paneles reales

`AdminHomepageSettingsPanel.tsx` (46 campos repartidos en 9 `SECTIONS`, un solo PATCH) se reemplaza por paneles independientes, cada uno con su propio guardado — mismo nivel de aislamiento que ya tienen los 11 paneles CRUD de lista. Mapeo de las 9 secciones actuales a los paneles nuevos:

| Sección actual | Panel nuevo | Campos |
|---|---|---|
| `identidad` + `info-superior` (dirección/horario) | **Información de empresa** (ya diseñado en el doc anterior) | siteName, logoUrl, infoBarLocation, infoBarHours + canales/redes |
| `hero` | **Hero** | badge, title, description, primaryCta×2, secondaryCta×2, image×2, testimonial×4, highlight×2 |
| `servicios` | **Servicios (encabezado)** | servicesTitle, servicesDescription — el catálogo en sí ya vive en `admin/services` tras la fusión B |
| `especialistas` | *(se elimina como sección de Content)* | badge/title/description de esta sección quedan pendientes de decidir en el plan: o se mudan a un campo de "Encabezado de equipo" dentro de Información de empresa, o se agregan como 3 campos sueltos en el nuevo formulario de Staff — decisión de implementación, no cambia el resultado visual |
| `agenda` | **Agenda (encabezado)** | bookingTitle, bookingDescription, bookingBenefitsTitle, bookingScheduleNote, bookingConsentNote |
| `contacto` | **Contacto (encabezado)** | contactTitle, contactDescription, contactSupportTitle, contactLocationsTitle, contactBrand, contactMapEmbedUrl — dirección/teléfono/email ya se movieron a Información de empresa |
| `acciones-flotantes` | *(se elimina)* | ya cubierto por Información de empresa (canales con placement="FLOATING") |
| `seo` | **SEO y metadatos** | metaTitle, metaDescription |

Cada panel nuevo sigue el patrón ya establecido por los paneles CRUD existentes en cuanto a feedback (loading/error/success explícito por guardado), pero es un formulario de campos únicos (no una lista), similar en forma al `AdminHomepageSettingsPanel` actual, solo que acotado a su propia sección — cada uno hace su propio PATCH a `/api/admin/homepage/settings` con solo sus campos, no los 46 juntos. Un error de validación en Hero ya no puede bloquear un guardado en SEO.

**Nota sobre el modelo de datos:** `HomepageSettings` sigue siendo una tabla singleton con todas estas columnas — no se parte en tablas separadas por sección, solo se parte la UI/API en superficies de guardado independientes. Partir la tabla en sí es un cambio de mayor riesgo sin beneficio claro (sigue siendo un solo registro de configuración global) y no fue parte de lo discutido.

### Sidebar resultante

Con la fusión de Especialistas/Servicios (secciones que desaparecen de Content) y el formulario partido, el sidebar de Content queda con una entrada real por componente editable, sin deep-links duplicados:

- **Información de empresa** (datos generales + canales + redes — ya diseñado)
- **Hero** (copy completo del hero)
- **Servicios** (solo encabezado — el catálogo se edita en `admin/services`)
- **Agenda** (opciones de agendamiento + beneficios + encabezado — quedan agrupados, a decidir en el plan si son 1 o 3 entradas)
- **Contacto** (encabezado + soporte + sedes + legales — quedan agrupados, misma decisión pendiente)
- **Navbar**
- **FAQ**
- **Campañas**
- **SEO y metadatos**

(La cantidad exacta de entradas dentro de "Agenda"/"Contacto" — si cada sub-panel CRUD existente mantiene su propia entrada o se anida bajo una sola — es una decisión de implementación de bajo impacto visual, se resuelve al escribir el plan, no requiere una decisión de diseño separada.)

## D. Toggles de visibilidad

`showSpecialists` se mueve al formulario de Staff (junto con el resto de la fusión A) — ya no aplica igual, dado que ahora es "quién se muestra" por profesional individual (`showOnHomepage`) en vez de un interruptor de sección completa. **Esto reemplaza al toggle de sección**: si ningún profesional tiene `showOnHomepage=true`, la sección de Especialistas simplemente no se renderiza (mismo comportamiento visual que hoy, pero derivado de datos en vez de un flag aparte) — se elimina la columna `HomepageSettings.showSpecialists` como redundante.

`showCampaigns` se queda exactamente donde está hoy (dentro del panel de Campañas), pero la descripción del sidebar pasa a mencionarlo explícitamente (ej. "Banners promocionales, con opción de ocultar toda la sección").

## E. Arreglos menores

- **Renombre**: "Canales de soporte" (`AdminHomepageContactSupportItemsPanel`, panel existente sin cambios de fondo) pasa a llamarse "Íconos de contacto rápido" en el sidebar, para no chocar con el nuevo "Canales de comunicación".
- **Traducción**: los placeholders/labels en inglés encontrados en el audit ("Value"/"Label" en Opciones de agendamiento, "WhatsApp href"/"WhatsApp label"/"Email href"/"Email label" en el formulario viejo — estos últimos de todas formas desaparecen al mudarse a Información de empresa) se traducen a español, consistente con el resto del CMS.
- **Preview de íconos**: en todo selector de ícono (Servicios, BookingBenefits, ContactSupportItems, SocialLinks, y el nuevo de Canales), el `<select>` de texto plano gana un preview visual del glifo junto a cada opción — mismo `@phosphor-icons/react` ya usado en todo el proyecto vía `@/components/ui/Icon`, solo se agrega el render del ícono al lado del nombre en el dropdown.

## Verificación

```
npm run build && npm run typecheck && npm run lint && npm run test
```

Además:
- Migración de Especialistas y Servicios corrida contra la base real, con reporte explícito de qué filas no encontraron coincidencia automática (para revisión manual, no se pierden ni se inventan datos).
- Verificación manual: el sitio público se ve igual el día del deploy para los profesionales/servicios que ya tenían `HomepageSpecialist`/`HomepageService` con coincidencia clara (deberían migrar con `showOnHomepage=true` automáticamente); los que no tenían coincidencia clara no aparecen hasta que un admin los revise y active a mano.
- Cada panel nuevo probado de forma aislada: un error de validación en un panel no debe afectar el guardado de otro (verifica que se resolvió el acoplamiento del formulario gigante).
- Los renombres/traducciones/previews de ícono no requieren migración de datos, solo cambios de UI — verificación visual simple.
