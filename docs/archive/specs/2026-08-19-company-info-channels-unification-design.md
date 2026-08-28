# Información de Empresa + Canales/Redes Unificados — Design

## Context

Siguiente paso del rediseño de `/portal/admin/content`, a partir de lo mapeado en `docs/archive/specs/2026-08-19-homepage-content-audit.md`. Ese audit encontró que la información básica de la clínica está fragmentada y duplicada en el código:

- El número de WhatsApp existe en **4 lugares independientes**: `infoBarWhatsappHref` (InfoBar), `floatingWhatsappNumber` (botón flotante), `contactWhatsapp` (footer), y un literal hardcodeado en `BookingForm.tsx` — ninguno lee de los otros.
- El teléfono existe en 2 lugares (`floatingPhoneNumber`, `contactPhone`), igual de desconectados.
- Las redes sociales SÍ son una única tabla compartida (`HomepageSocialLink`), pero sin forma de decidir dónde aparece cada una — hoy es todo o nada, la misma lista completa en InfoBar y en el footer.
- El JSON-LD de `app/page.tsx` duplica address/horario/redes sociales con literales hardcodeados propios, aparte de todo lo anterior — puede desincronizarse en silencio de lo que el admin edita.
- La identidad de marca (nombre, logo) y los datos generales (dirección, horario) viven en secciones separadas del Content CMS ("Identidad de marca" y "Barra superior"), aunque conceptualmente son la misma clase de información: datos generales de la empresa.

El usuario pidió explícitamente: unificar todo esto en una fuente única de verdad por dato, con control de en qué lugares del sitio aparece cada canal/red social — ejemplo dado: Facebook visible en el footer pero no en el InfoBar, mismo dato en ambos lugares si estuviera activo en los dos.

## Alcance

**Dentro de este diseño:**
1. Nuevo modelo `HomepageChannel` (WhatsApp/Teléfono/Email) — lista dinámica, unifica los 4+ lugares fragmentados de hoy.
2. `HomepageSocialLink` (ya existe) — se le agrega control de "dónde aparece", mismo mecanismo que los canales.
3. Reorganización del sidebar de Content: nueva sección "Información de empresa" que agrupa identidad (nombre/logo), datos generales (dirección/horario), canales, y redes sociales.
4. Actualización de los 4 consumidores públicos (InfoBar, FloatingActions, ContactSection, BookingForm) para leer de la fuente unificada filtrando por ubicación, en vez de campos fijos de `HomepageSettings`.
5. Actualización del JSON-LD de `app/page.tsx` para leer de la misma fuente unificada en vez de sus literales propios.
6. Migración automática de los datos existentes — el sitio no debe verse distinto el día del deploy.

**Fuera de alcance (explícitamente, decisiones tomadas durante el brainstorming):**
- Los bugs de `Hero.tsx` (`badge`/`highlight` no renderizados) y `BookingForm.tsx` (`selectLabel`/`options`/`consentNote` no renderizados) encontrados en el audit — quedan para otra pasada.
- Soporte real de múltiples sedes físicas (cada una con su propia dirección/horario) — la clínica sigue siendo una sola sede; `HomepageLocation` ("Sedes") se queda como está, sin tocar, como tarjetas de marketing descriptivas separadas de este rediseño.
- Un campo nuevo de "lema"/tagline — no se agrega, no existe pedido real de contenido para esto, solo se mencionó como ejemplo.
- Control de "dónde aparece" para nombre/logo/dirección/horario — estos son campos únicos (no listas), no llevan el mecanismo de toggle por ubicación; siguen apareciendo automáticamente donde ya aparecen hoy (Navbar, InfoBar, footer, JSON-LD).
- El botón "Ir a agenda" del stack de botones flotantes — queda hardcodeado, no es un canal.

## Modelo de datos

### Nuevo enum `HomepageContentPlacement`

```prisma
enum HomepageContentPlacement {
  INFOBAR
  FLOATING
  FOOTER
  BOOKING
}
```

Cuatro ubicaciones, correspondientes 1:1 a los cuatro consumidores públicos que hoy muestran canales/redes: la barra superior (`InfoBar.tsx`), los botones flotantes (`FloatingActions.tsx`), el bloque de contacto del footer (`ContactSection.tsx`), y la tarjeta "¿Tienes dudas?" del formulario de agenda (`BookingForm.tsx`).

### Nuevo modelo `HomepageChannel`

```prisma
enum HomepageChannelType {
  WHATSAPP
  PHONE
  EMAIL
}

model HomepageChannel {
  id         String                       @id @default(uuid())
  type       HomepageChannelType
  value      String
  label      String
  placements HomepageContentPlacement[]
  sortOrder  Int                          @default(0)
  isActive   Boolean                      @default(true)
  createdAt  DateTime                     @default(now())
  updatedAt  DateTime                     @updatedAt

  @@index([isActive, sortOrder])
}
```

- `value`: el dato crudo — número de WhatsApp/teléfono en formato internacional sin símbolos (ej. `573237968435`, mismo formato que usan hoy `floatingWhatsappNumber`/`floatingPhoneNumber`), o la dirección de email completa.
- `label`: texto mostrado junto al ícono cuando el canal se renderiza con texto (ej. "Agenda por WhatsApp"); para email, dado que pasa a ser ícono-solo en InfoBar, `label` sirve como `aria-label`/tooltip de accesibilidad.
- La construcción del href final (`wa.me/...`, `tel:...`, `mailto:...`) sigue el mismo patrón que ya existe en `homepage-adapter.ts` (`normalizeWhatsappHref`/`normalizePhoneHref`) — se generaliza para operar sobre `HomepageChannel.value` en vez de sobre los campos sueltos de `settings`.
- Dinámico como se acordó: un admin puede agregar más de un WhatsApp, más de un teléfono, etc. — no hay restricción de "máximo uno por tipo".

### `HomepageSocialLink` — extensión

```prisma
model HomepageSocialLink {
  id         String                       @id @default(uuid())
  href       String
  label      String
  iconKey    String
  placements HomepageContentPlacement[]   // nuevo campo
  sortOrder  Int                          @default(0)
  isActive   Boolean                      @default(true)
  createdAt  DateTime                     @default(now())
  updatedAt  DateTime                     @updatedAt

  @@index([isActive, sortOrder])
}
```

Todo lo demás del modelo (CRUD, reorder, icon picker) se mantiene igual — solo se agrega `placements`.

### Migración de datos existentes

Un script de migración (mismo patrón que el resto de las migraciones ya hechas en este proyecto — `prisma migrate diff` + `prisma migrate deploy`, sin tocar datos vía `migrate dev`) que:

1. Lee los valores actuales de `HomepageSettings`: `infoBarWhatsappHref`/`infoBarWhatsappLabel`, `floatingWhatsappNumber`, `contactWhatsapp`, `floatingPhoneNumber`, `contactPhone`, `infoBarEmailHref`/`infoBarEmailLabel`, `contactEmail`.
2. Deduplica por valor real (el mismo número de WhatsApp que aparece en 3 campos distintos se convierte en **una sola** fila de `HomepageChannel`, no en tres).
3. Asigna `placements` reconstruyendo el comportamiento visual de hoy:
   - WhatsApp: `[INFOBAR, FLOATING, FOOTER, BOOKING]` (aparece en los 4 lugares hoy, aunque de forma fragmentada/hardcodeada).
   - Teléfono: `[FLOATING, FOOTER]` (hoy no aparece en InfoBar ni en BookingForm).
   - Email: `[INFOBAR, FOOTER]` (hoy no aparece en el botón flotante ni en BookingForm).
4. Para `HomepageSocialLink`, las filas existentes reciben `placements = [INFOBAR, FOOTER]` (su comportamiento actual — aparecen en ambos lugares hoy, sin distinción).
5. Verificación post-migración: comparar `count()` antes/después, y una revisión manual de que el sitio se ve igual tras el deploy (mismos valores, mismos lugares).

### Columnas obsoletas a eliminar de `HomepageSettings`

Una vez migrados y verificados: `infoBarWhatsappHref`, `infoBarWhatsappLabel`, `infoBarEmailHref`, `infoBarEmailLabel`, `floatingWhatsappNumber`, `floatingPhoneNumber`, `contactWhatsapp`, `contactPhone`, `contactEmail`. Se eliminan del schema — no quedan como columnas muertas sin usar (ya encontramos dos de esas en el audit, `infoBarPhone`/`contactHours`, no hay que sumar más).

**Se mantienen sin tocar** (no son parte de esta unificación): `siteName`, `logoUrl`, `infoBarLocation`, `infoBarHours`, `contactAddress` (aunque duplica `infoBarLocation` — ver nota abajo), `contactTitle`/`contactDescription`, y el resto de campos de otras secciones.

**Nota sobre `contactAddress` vs `infoBarLocation`:** el audit encontró que hoy son dos campos independientes que casualmente contienen el mismo valor. Este diseño no los unifica como modelo de datos (está fuera del alcance acordado — dirección es un campo único sin toggle de ubicación), pero al mover "Dirección" a la sección "Datos generales" de "Información de empresa", el formulario expone un solo campo de dirección en pantalla que, al guardar, escribe el mismo valor a ambas columnas (`infoBarLocation` y `contactAddress`) — evita que un admin edite una y no la otra sin darse cuenta.

**Horario no tiene el mismo problema:** "Datos generales" solo escribe a `infoBarHours`. `bookingScheduleNote` es contenido editorial distinto (la nota de horario dentro del formulario de agenda, con su propio propósito) y no se toca. `contactHours` es la columna muerta que el audit ya identificó para eliminar — no existe un segundo campo de horario activo que unificar.

## API

### `app/api/admin/homepage/channels/` (nuevo)

Mismo patrón exacto que `nav-links` y `social-links` (ya usado tres veces en este proyecto):

- `GET /api/admin/homepage/channels` → `{channels: ChannelPayload[]}`
- `POST /api/admin/homepage/channels` → crea, `sortOrder` auto-incremental vía `aggregate({_max})`
- `PATCH /api/admin/homepage/channels/[id]` → actualización parcial
- `DELETE /api/admin/homepage/channels/[id]` → borra y recalcula `sortOrder` de los restantes (transacción)
- `PATCH /api/admin/homepage/channels/reorder` → valida conteo/duplicados/IDs desconocidos, reordena (transacción)

`ChannelPayload = {id, type, value, label, placements, sortOrder, isActive}`. Validación: `type` enum, `value` con formato según `type` (WhatsApp/Teléfono: solo dígitos, longitud razonable; Email: formato de email válido), `placements` array de valores del enum (puede ser vacío — un canal inactivo/sin mostrar en ningún lado es válido, no un error).

### `app/api/admin/homepage/social-links/` (extensión)

Se agrega `placements` al schema de creación/actualización (`socialLinkCreateSchema`/`socialLinkUpdateSchema` en `app/api/admin/homepage/social-links/route.ts` y `[linkId]/route.ts`), mismo formato de validación que en `channels`. El resto de los endpoints (GET/POST/PATCH/DELETE/reorder) no cambian de forma.

### `lib/marketing/homepage.ts` — pipeline

`getHomepageContent()` agrega una query más al `$transaction` existente: `prisma.homepageChannel.findMany({where: {isActive: true}, orderBy: {sortOrder: "asc"}})`. El resultado se agrega a `HomepageNormalizedContent` como un nuevo campo top-level `channels: HomepageChannelContent[]` (tipo `{type, value, label, placements}[]`, definido en `homepage-types.ts`). `socials` (ya existente, usado por `infoBar.socials` y `contact.socials`) gana el campo `placements` en su tipo.

Los cuatro componentes públicos ya no leen `infoBar.whatsapp`/`infoBar.email`/`contact.channels[0..2]`/`floatingActions.whatsappNumber`/`floatingActions.phoneNumber` como campos fijos — en su lugar, cada uno recibe la lista completa de `channels`+`socials` y filtra client-side (o el adapter filtra antes de pasar props, ver siguiente sección) por `placements.includes("INFOBAR" | "FLOATING" | "FOOTER" | "BOOKING")`.

## Content CMS — reorganización del sidebar

Grupo **"Información de empresa"** (reemplaza al grupo "Marca / Header" actual) con tres entradas:

1. **Datos generales** (`slug: "company-info"`) — nombre de la empresa, logo, dirección, horario. Reemplaza la sección "Identidad de marca" actual y absorbe dirección/horario que hoy viven en "Barra superior". Sin toggle de ubicación — campos únicos, se muestran automáticamente donde ya se muestran.
2. **Canales de comunicación** (`slug: "channels"`, panel nuevo `AdminHomepageChannelsPanel.tsx`) — lista con CRUD completo (mismo patrón visual que `AdminHomepageSocialLinksPanel.tsx`/`AdminHomepageNavLinksPanel.tsx`: tarjetas con Subir/Bajar/Editar/Eliminar), cada tarjeta con selector de tipo (WhatsApp/Teléfono/Email), campo de valor, campo de label, y 4 checkboxes de ubicación ("Barra superior", "Botón flotante", "Footer", "Formulario de agenda").
3. **Redes sociales** (`slug: "social"`, ya existe como `AdminHomepageSocialLinksPanel.tsx`) — se le agregan los mismos 4 checkboxes de ubicación a cada tarjeta existente.

"Barra superior" (`slug: "info-superior"`, hoy dentro de "Configuración completa") **desaparece** como sección — su contenido queda repartido entre "Datos generales" (dirección, horario) y "Canales de comunicación"/"Redes sociales" (WhatsApp, email, vía el checkbox "Barra superior").

"SEO y metadatos" y "Navbar" no cambian.

`AdminHomepageSettingsPanel.tsx`'s `SECTIONS` array pierde las entradas `info-superior` y los campos de WhatsApp/email dentro de `identidad`; gana los campos de dirección/horario dentro de una sección renombrada/reorganizada. Dado que `identidad` ya existe como slug con nombre/logo, "Datos generales" puede ser una extensión de esa misma sección (renombrada) en vez de una sección nueva — decisión de implementación a tomar en el plan, no cambia el resultado para el admin.

## Consumo en el sitio público

- **`InfoBar.tsx`**: recibe `channels`/`socials` ya filtrados por `INFOBAR` desde el adapter, en vez de props fijas `whatsapp`/`email`/`socials`. Email pasa a renderizarse ícono-solo (sin texto), mismo tratamiento visual que los íconos de redes sociales.
- **`FloatingActions.tsx`**: pasa de 3 botones fijos (WhatsApp, Teléfono, "Ir a agenda") a una lista dinámica — cada canal/red social con `placements` incluyendo `FLOATING` se agrega como un botón más, en el orden de `sortOrder`; "Ir a agenda" se mantiene como acción fija adicional, no es parte de esta lista. Sin tope artificial en la cantidad de botones — queda a criterio del admin cuántos activar acá.
- **`ContactSection.tsx`**: el bloque de canales del footer y la lista de redes sociales se filtran por `FOOTER` en vez de leer `contact.channels`/`contact.socials` como campos fijos armados desde `settings`.
- **`BookingForm.tsx`**: la tarjeta "¿Tienes dudas?" deja de tener el WhatsApp/teléfono hardcodeado (bug ya identificado en el audit) — se renderiza desde `channels`/`socials` filtrados por `BOOKING`. Es la primera vez que redes sociales pueden aparecer acá si se activan.
- **`app/page.tsx` (JSON-LD)**: `telephone`, `email`, `sameAs` dejan de tener fallbacks/literales propios — se construyen desde `HomepageChannel`/`HomepageSocialLink` (cualquier canal/red activo, sin filtrar por ubicación específica ya que el JSON-LD es metadata global, no una sección visual). `address`/`geo`/`openingHoursSpecification`/`priceRange` quedan fuera de este diseño (no son canales ni redes sociales) — siguen hardcodeados como hoy, sin cambios.

## Quality bar

- Paleta/tokens: mismos ya bloqueados (`STATUS_COLORS`, `Card`, `brand-teal`/`accent-cyan`), sin nuevos.
- Voz/tono: español tú-form, sentence case, consistente con el resto de `/portal/admin/content`.
- Los checkboxes de ubicación siguen el mismo patrón de estado (loading/error/success explícito) ya establecido en `AdminHomepageSocialLinksPanel.tsx`/`AdminHomepageNavLinksPanel.tsx`.
- Sin scroll horizontal en 375/768/1280px.

## Verificación

```
npm run build && npm run typecheck && npm run lint && npm run test
```

Además:
- Migración de datos corrida contra la base real, con `count()` antes/después confirmando cero pérdida de datos, y verificación visual de que el sitio se ve igual al desplegar (mismos WhatsApp/teléfono/email/redes en los mismos lugares que hoy).
- Caso de prueba explícito: crear/editar una red social con `placements=[FOOTER]` únicamente, confirmar que NO aparece en InfoBar y SÍ en el footer.
- Los 4 placements probados en vivo cuando el entorno de browser lo permita: activar/desactivar un canal en cada ubicación y confirmar que aparece/desaparece solo donde corresponde.
- Confirmar que el JSON-LD generado sigue siendo válido (schema.org Dentist) tras leer de la fuente unificada.
