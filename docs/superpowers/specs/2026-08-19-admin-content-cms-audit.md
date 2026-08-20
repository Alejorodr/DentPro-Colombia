# Admin Content CMS Audit — `/portal/admin/content`

**Fecha:** 2026-08-19
**Propósito:** Auditoría del lado admin de `/portal/admin/content` en sí — cada panel, buscando redundancia, confusión de UX, patrones inconsistentes, y exceso — para informar la próxima pasada de simplificación del CMS completo, no solo la unificación de canales/redes ya aprobada.

**Alcance cubierto:** `ContentShell.tsx`, `ContentSidebar.tsx`, los 13 componentes de panel bajo `app/portal/admin/content/`, los 4 archivos bajo `app/portal/admin/content/components/`, y referencias cruzadas con `app/api/admin/homepage/settings/route.ts` y módulos adyacentes (`app/portal/admin/staff/`, modelos Prisma `Service`/`ProfessionalProfile`) donde revelan duplicación no visible solo desde adentro de `/content`.

**Excluido explícitamente:** la fragmentación de WhatsApp/teléfono/email/redes sociales (ya resuelta por el diseño aprobado en `2026-08-19-company-info-channels-unification-design.md`), y todo lo ya registrado en `2026-08-19-homepage-content-audit.md` (badge/highlight muertos en Hero, selectLabel/options/consentNote muertos en BookingForm, bug de services.badge, columnas muertas infoBarPhone/contactHours, CTA/login hardcodeados del Navbar, duplicación del JSON-LD, etc.) salvo que surgiera un ángulo nuevo.

---

## Panel: AdminHomepageSettingsPanel (file: `app/portal/admin/content/AdminHomepageSettingsPanel.tsx`)

**Entrada de sidebar:** alcanzable desde **10 entradas distintas del sidebar, repartidas en 5 grupos diferentes**, todas renderizando exactamente el mismo componente, solo difiriendo en qué sección del acordeón se abre automáticamente (`openSlug`):
- Grupo "Marca / Header": `settings` ("Configuración completa"), `identidad` ("Identidad de marca"), `seo` ("SEO y metadatos"), `infobar` ("Barra superior")
- Grupo "Hero": `hero-copy` ("Textos del hero")
- Grupo "Servicios": `servicios-copy` ("Encabezado de servicios")
- Grupo "Equipo": `especialistas-copy` ("Encabezado del equipo")
- Grupo "Agenda": `agenda-copy` ("Textos de agenda")
- Grupo "Contacto / Footer": `floating` ("Botones flotantes"), `contacto-copy` ("Textos de contacto")

(mapeo en `ContentShell.tsx:24-43`; también es el fallback `default` en `ContentShell.tsx:68-69`, y `DEFAULT_SECTION = "settings"` en `ContentSidebar.tsx:151` significa que es donde el admin aterriza primero.)

**Campos/contenido que maneja:** 46 campos repartidos en 9 `SECTIONS` internas (`AdminHomepageSettingsPanel.tsx:137-273`): `identidad` (siteName, logoUrl), `info-superior` (infoBarLocation, infoBarHours, infoBarWhatsappHref/Label, infoBarEmailHref/Label), `hero` (badge, title, description, 2 CTAs, imagen, testimonio ×4, highlight ×2 — 14 campos), `servicios` (title, description), `especialistas` (badge, title, description), `agenda` (title, description, selectLabel, benefitsTitle, scheduleNote, consentNote), `contacto` (title, description, phone, whatsapp, email, address, supportTitle, locationsTitle, brand, mapEmbedUrl — 10 campos), `acciones-flotantes` (floatingWhatsappNumber, floatingPhoneNumber), `seo` (metaTitle, metaDescription).

**Patrón de UI:** un formulario gigante — una sola página de acordeones `CollapsibleCard`, un solo endpoint PATCH (`/api/admin/homepage/settings`), un solo botón "Guardar cambios" que envía **los 46 campos a la vez** sin importar cuál sección se editó de verdad.

**Hallazgos:**
- El propio texto del panel ("Vista completa... en un solo lugar", `ContentSidebar.tsx:15`) no es exacto: dos columnas reales de `HomepageSettings` — `showSpecialists` y `showCampaigns` — existen en la misma tabla, se validan en el mismo schema Zod (`route.ts:146-147`), se devuelven en el mismo `GET` (`route.ts:271-272`), pero **nunca se renderizan en este formulario "completo"**. Solo son editables vía `SectionVisibilityToggle` embebido dentro de dos paneles CRUD no relacionados (Especialistas, Campañas) — ver hallazgos abajo.
- Como el schema PATCH valida el payload completo en cada guardado (`homepageSettingsPatchSchema` es `.partial()` pero el form siempre manda todas las keys con valor, `AdminHomepageSettingsPanel.tsx:346-350`), un error de validación en una sección (ej. un `siteName` vacío) puede bloquear el guardado de una sección totalmente distinta (ej. `metaDescription` en SEO) — un acoplamiento entre secciones real que los otros 11 paneles-lista no tienen, ya que cada uno guarda su fila de forma independiente.
- 10 entradas de sidebar en 5 grupos distintos apuntan al mismo componente. Un admin que quiere editar el texto del hero tiene dos filas de sidebar distintas que lo llevan ahí ("Configuración completa" bajo "Marca / Header" y "Textos del hero" bajo "Hero") sin ninguna señal visual de que son el mismo formulario — esto infla la superficie aparente del sidebar (22 entradas) muy por encima del número real de superficies de edición distintas (13 componentes únicos).
- Labels mezclando idiomas dentro de un formulario en español: "WhatsApp href", "WhatsApp label", "Email href", "Email label" (`AdminHomepageSettingsPanel.tsx:154-157`) — términos técnicos en inglés sin traducir, a diferencia del resto de labels en español de la misma sección ("Ubicación", "Horario").

---

## Panel: AdminHomepageNavLinksPanel (file: `app/portal/admin/content/AdminHomepageNavLinksPanel.tsx`)

**Entrada de sidebar:** "Navbar" — "Enlaces del menú de navegación superior." (`ContentSidebar.tsx:19`)
**Campos/contenido:** `href`, `label`, `isActive`, `sortOrder` — tabla `HomepageNavLink`.
**Patrón de UI:** lista CRUD (Card por ítem, Subir/Bajar/Editar/Eliminar, formulario de ítem nuevo arriba).
**Hallazgos:** ninguno específico. Limpio, propósito único, nombres consistentes (placeholder "Etiqueta" en español, a diferencia del panel de Opciones de agendamiento más abajo).

---

## Panel: AdminHomepageHeroStatsPanel (file: `app/portal/admin/content/AdminHomepageHeroStatsPanel.tsx`)

**Entrada de sidebar:** "Estadísticas hero" — "Contadores debajo de los botones principales." (`ContentSidebar.tsx:26`)
**Campos/contenido:** `label`, `description`, `isActive`, `sortOrder` — tabla `HomepageHeroStat`.
**Patrón de UI:** lista CRUD, misma forma que NavLinks.
**Hallazgos:** ninguno específico.

---

## Panel: AdminHomepageServicesPanel (file: `app/portal/admin/content/AdminHomepageServicesPanel.tsx`)

**Entrada de sidebar:** "Catálogo de servicios" — "Tarjetas de la sección '¿Qué hacemos?'." (`ContentSidebar.tsx:37`)
**Campos/contenido:** `title`, `description`, `iconKey`, `isActive`, `sortOrder`, más `highlights[]` anidado (su propio sub-CRUD con su propio reorder) — tablas `HomepageService` + `HomepageServiceHighlight`.
**Patrón de UI:** lista CRUD con un sub-CRUD anidado (highlights) dentro de cada tarjeta — el único panel con dos niveles de gestión de listas, más un puente "Importar del catálogo clínico" (`AdminHomepageServicesPanel.tsx:296-328`).
**Hallazgos:** el panel documenta explícitamente en su propia UI el riesgo de duplicación: *"Estas son las tarjetas visuales de marketing... Son diferentes al catálogo clínico (con precios) que se gestiona en admin/services"* (`AdminHomepageServicesPanel.tsx:291-293`). Ofrece una acción "Importar" de una sola vez y de un solo sentido que copia `title`/`description` desde el modelo `Service` real (catálogo clínico con precios, `prisma/schema.prisma:258-272`) hacia una fila nueva y desconectada de `HomepageService` — después de importar, los dos registros no tienen ninguna relación; renombrar el servicio clínico no toca la tarjeta de marketing y viceversa. Es un punto real de entrada duplicada de datos, distinto del tema de canales ya resuelto en otro lado.

---

## Panel: AdminHomepageSpecialistsPanel (file: `app/portal/admin/content/AdminHomepageSpecialistsPanel.tsx`)

**Entrada de sidebar:** "Especialistas" — "Tarjetas del equipo clínico." (`ContentSidebar.tsx:48`)
**Campos/contenido:** `fullName`, `specialty`, `bioShort`, `imageUrl`, `altText`, `isActive`, `sortOrder` — tabla `HomepageSpecialist`. También embebe `SectionVisibilityToggle` para `showSpecialists` (`AdminHomepageSpecialistsPanel.tsx:45,180-186`), que hace PATCH a `/api/admin/homepage/settings` — una API/tabla totalmente distinta al resto de las llamadas CRUD propias del panel (`/api/admin/homepage/specialists`).
**Patrón de UI:** lista CRUD + un toggle de configuración embebido de una API distinta.
**Hallazgos:**
- Este es el *único* lugar de todo el CMS donde `showSpecialists` es editable, y no se menciona en la descripción del sidebar ("Tarjetas del equipo clínico" no dice nada de un switch de visibilidad) — un admin buscando "cómo oculto la sección de especialistas" no tiene ninguna pista a nivel de label de que vive acá y no en "Configuración completa".
- Duplicación entre módulos no detectada en la auditoría anterior: existe un **módulo separado y desconectado "Equipo clínico" / Staff** en `app/portal/admin/staff/page.tsx` (que renderiza `AdminProfessionalsPanel`) respaldado por `ProfessionalProfile`/`User` (cuentas de login reales, ligadas a especialidad, agenda, reglas de disponibilidad). Las tarjetas de `HomepageSpecialist` (`fullName`, `specialty`, `bioShort`, foto) representan a las *mismas personas reales* pero como copy de marketing en texto libre, con **cero vínculo** al registro profesional real — a diferencia de Servicios, ni siquiera hay un puente de importación de un solo sentido acá. Un admin que da de alta un dentista nuevo tiene que tipear su nombre y especialidad dos veces, en dos áreas admin distintas, sin referencia cruzada ni aviso si se desincronizan (ej. un profesional se va de la clínica — se desactiva en Staff, pero su tarjeta de marketing puede seguir viva en silencio en la home).

---

## Panel: AdminHomepageBookingOptionsPanel (file: `app/portal/admin/content/AdminHomepageBookingOptionsPanel.tsx`)

**Entrada de sidebar:** "Opciones de agendamiento" — "Métodos disponibles para agendar." (`ContentSidebar.tsx:59`)
**Campos/contenido:** `value`, `label`, `isActive`, `sortOrder` — tabla `HomepageBookingOption`.
**Patrón de UI:** lista CRUD, misma forma que las demás.
**Hallazgos:** la auditoría anterior ya marcó esta feature completa como muerta (sin consumidor `<select>` en `BookingForm.tsx`) — no se re-marca acá como código muerto, pero hay dos puntos *nuevos* para la conversación de rediseño: (1) su formulario de "nueva opción" usa placeholders en inglés crudo "Value" (`AdminHomepageBookingOptionsPanel.tsx:171`) y "Label" (`:172`) en vez de español — inconsistente con todos los paneles hermanos (NavLinks/SocialLinks usan "Etiqueta"); (2) su descripción de sidebar ("Métodos disponibles para agendar") suena como si configurara cómo los pacientes agendan — nada en la descripción avisa que este panel completo no tiene ningún efecto en el sitio público hoy, exactamente el tipo de "ítem de sidebar que parece importante pero no lo es" que una pasada de rediseño debería resolver, ya sea conectándolo o eliminando el panel+entrada de sidebar juntos.

---

## Panel: AdminHomepageBookingBenefitsPanel (file: `app/portal/admin/content/AdminHomepageBookingBenefitsPanel.tsx`)

**Entrada de sidebar:** "Beneficios de agendar" — "Textos debajo del formulario de agenda." (`ContentSidebar.tsx:60`)
**Campos/contenido:** `iconKey`, `text`, `isActive`, `sortOrder` — tabla `HomepageBookingBenefit`.
**Patrón de UI:** lista CRUD.
**Hallazgos:** ninguno específico — correctamente consumido por `BookingForm.tsx` según la auditoría anterior.

---

## Panel: AdminHomepageSocialLinksPanel (file: `app/portal/admin/content/AdminHomepageSocialLinksPanel.tsx`)

**Entrada de sidebar:** "Redes sociales" — "Íconos que enlazan a Instagram, Facebook, etc." (`ContentSidebar.tsx:91`), en su propio grupo de nivel superior "Redes", separado de "Contacto / Footer".
**Campos/contenido:** `href`, `label`, `iconKey`, `isActive`, `sortOrder` — tabla `HomepageSocialLink`.
**Patrón de UI:** lista CRUD.
**Hallazgos:** el subtítulo del propio panel es inusualmente consciente de su problema: *"Lista única usada en InfoBar y en el bloque de Contacto"* (`AdminHomepageSocialLinksPanel.tsx:169`) — es exactamente el problema de "todo o nada" que el diseño de unificación ya aprobado está resolviendo, no se re-marca acá. Vale la pena solo como observación de agrupamiento: este panel vive solo en un grupo "Redes" de un solo ítem, mientras que funcionalmente es el mismo tipo de contenido que "Canales de soporte"/"Botones flotantes" del grupo "Contacto / Footer" — tres paneles distintos editando contenido de "cómo nos contactan los pacientes", repartidos en dos grupos de sidebar sin ningún label compartido que señale la relación (ya resuelto hacia adelante por el nuevo grupo "Información de empresa" del diseño aprobado, no se re-litiga acá más allá de notar el split actual).

---

## Panel: AdminHomepageContactSupportItemsPanel (file: `app/portal/admin/content/AdminHomepageContactSupportItemsPanel.tsx`)

**Entrada de sidebar:** "Canales de soporte" — "Íconos de contacto rápido." (`ContentSidebar.tsx:77`)
**Campos/contenido:** `iconKey`, `text`, `isActive`, `sortOrder` — tabla `HomepageContactSupportItem`.
**Patrón de UI:** lista CRUD.
**Hallazgos:** el label "Canales de soporte" es fácil de confundir con el nuevo panel "Canales de comunicación" que viene del diseño aprobado — son conceptos distintos (este es una lista de ícono+texto libre que se renderiza en la columna de soporte del bloque de contacto; el nuevo panel "Canales" va a manejar WhatsApp/teléfono/email). Vale la pena marcarlo puramente como *riesgo de colisión de nombres* para quien implemente la próxima pasada de rediseño, ya que "canal"/"canales" está por convertirse en un término sobrecargado en el sidebar (este panel ya lo usa, el diseño nuevo introduce "Canales de comunicación" para algo completamente distinto).

---

## Panel: AdminHomepageLocationsPanel (file: `app/portal/admin/content/AdminHomepageLocationsPanel.tsx`)

**Entrada de sidebar:** "Sedes / ubicaciones" — "Tarjetas de sede con dirección y horario." (`ContentSidebar.tsx:78`)
**Campos/contenido:** solo `name`, `description`, `isActive`, `sortOrder` — tabla `HomepageLocation` (`AdminHomepageLocationsPanel.tsx:8-14`).
**Patrón de UI:** lista CRUD.
**Hallazgos:** la descripción del sidebar promete "dirección y horario" como si fueran campos estructurados distintos, pero el panel expone solo un textarea de texto libre `description` (`AdminHomepageLocationsPanel.tsx:172,199`) — un admin tiene que saber que debe escribir dirección y horario juntos en un solo bloque de texto bajo un label genérico "Descripción". Es un desajuste entre lo que promete el sidebar y lo que el panel realmente ofrece, independiente de la duplicación `contactAddress`/`infoBarLocation` ya cubierta por el diseño de unificación aprobado (ese diseño deja `HomepageLocation` explícitamente sin tocar, así que este desajuste sobrevive a la próxima pasada de rediseño a menos que alguien lo note por separado).

---

## Panel: AdminHomepageLegalLinksPanel (file: `app/portal/admin/content/AdminHomepageLegalLinksPanel.tsx`)

**Entrada de sidebar:** "Enlaces legales" — "Política de privacidad, términos, etc." (`ContentSidebar.tsx:79`)
**Campos/contenido:** `href`, `label`, `isActive`, `sortOrder` — tabla `HomepageLegalLink`.
**Patrón de UI:** lista CRUD.
**Hallazgos:** ninguno específico.

---

## Panel: AdminHomepageFaqPanel (file: `app/portal/admin/content/AdminHomepageFaqPanel.tsx`)

**Entrada de sidebar:** "Preguntas frecuentes" — "Preguntas y respuestas + SEO estructurado." (`ContentSidebar.tsx:71`)
**Campos/contenido:** `question`, `answer`, `isActive`, `sortOrder` — tabla `HomepageFaq`.
**Patrón de UI:** lista CRUD, un poco más pulido que sus hermanos (bloques `<label>` en vez de `<input>` sueltos, estado vacío explícito, hint de límite de caracteres en el copy de intro).
**Hallazgos:** ninguno específico — pero en contraste, este es el *único* panel CRUD que declara sus propios límites de validación en el texto de descripción ("Máx. 500 caracteres por pregunta, 2.000 por respuesta", `AdminHomepageFaqPanel.tsx:165-167`); ninguno de los otros 10 paneles-lista muestra sus límites de longitud máxima en ningún lado de la UI, una inconsistencia en cuánta guía da cada panel (menor, pero si un rediseño estandariza el chrome de los paneles, este es el panel de referencia para "metadata útil", no el outlier a podar).

---

## Panel: AdminCampaignsPanel (file: `app/portal/admin/content/AdminCampaignsPanel.tsx`)

**Entrada de sidebar:** "Campañas" — "Banners promocionales con fecha de inicio y fin." (`ContentSidebar.tsx:97`), único ítem en su propio grupo "Marketing".
**Campos/contenido:** `title`, `description`, `imageUrl`, `ctaText`, `ctaUrl`, `startAt`, `endAt`, `active` — modelo Prisma `Campaign` vía `/api/campaigns` (no `/api/admin/homepage/*`, un namespace de API distinto al de todos los demás paneles). También embebe `SectionVisibilityToggle` para `showCampaigns` (`AdminCampaignsPanel.tsx:46,184-190`), mismo patrón que Specialists.
**Patrón de UI:** tabla/modal — el único panel de todo el CMS que usa una **tabla** de datos con buscador y un **modal de edición** en vez del patrón de lista-de-tarjetas que usan todos los demás paneles. También el único panel con un componente `Table` importado y un filtro de búsqueda.
**Hallazgos:**
- Outlier de patrón de UI: 12 de 13 paneles usan el mismo patrón "Card por ítem + edición inline"; este solo usa filas de tabla + un modal centrado. Funcionalmente está bien, pero es un segundo patrón de interacción que un admin tiene que aprender sin una razón aparente de modelo de contenido (Campaign tiene aproximadamente la misma cantidad/forma de campos que `HomepageService` o `HomepageSpecialist`, que sí usan el patrón de Card).
- Mismo patrón de "el toggle de visibilidad vive en un panel CRUD no relacionado" que Specialists — ver hallazgo bajo `AdminHomepageSettingsPanel` arriba; esta es la segunda (y única otra) instancia de ese patrón en el código.
- Este es el único panel dueño de contenido cuya API de respaldo (`/api/campaigns`) *no* está bajo el namespace `/api/admin/homepage/*` como los otros 11 paneles CRUD — una observación de consistencia/nombrado de la capa de API, señalada acá porque es el único panel donde la experiencia de sidebar (se siente idéntica a sus hermanos) esconde un path de backend genuinamente distinto.

---

## Panel: AdminBootstrapButton (file: `app/portal/admin/content/AdminBootstrapButton.tsx`)

**Entrada de sidebar:** no es una entrada de sidebar en absoluto — se renderiza una vez, siempre visible, en el header de `ContentShell` (`ContentShell.tsx:96`), fuera por completo del mecanismo de cambio de sección.
**Campos/contenido:** ninguno; dispara `POST /api/admin/homepage/bootstrap` para rellenar defaults faltantes.
**Patrón de UI:** botón de acción único con un diálogo `confirm()` nativo y texto inline de ok/error.
**Hallazgos:** preocupación de complejidad de bajo valor solo en el encuadre — es un botón utilitario único, siempre visible, sin ninguna explicación de *qué* "Poblar desde defaults" realmente puebla (cuáles de las 13 tablas/46 campos de settings se tocan), sentado permanentemente en el header de la página sin importar qué sección esté viendo el admin. No está sobreconstruido, pero su alcance es invisible para el admin hasta que hace clic (mitigado en parte por el texto del `confirm()` que explica que solo rellena huecos, no sobrescribe).

---

## Componentes: `components/AdminImageField.tsx`, `components/ImageCropModal.tsx`, `components/CollapsibleCard.tsx`, `components/SectionVisibilityToggle.tsx`

No alcanzables directamente desde el sidebar — bloques de construcción compartidos.
**Hallazgos:** estas son las piezas mejor construidas y más consistentes del CMS — `AdminImageField` (subida + recorte + pegar URL + preview en vivo, reusado idénticamente en Settings/Specialists/Campaigns) y `CollapsibleCard` (reusado solo dentro del formulario gigante de Settings) están apropiadamente acotados y no muestran exceso de complejidad. `SectionVisibilityToggle` está bien construido pero, como se notó dos veces arriba, se instancia en exactamente dos lugares que no tienen ningún vínculo de nombrado/agrupamiento con el setting que controlan (el panel de Especialistas controla `showSpecialists`, el de Campañas controla `showCampaigns` — mapeo 1:1 razonable en cada caso individual, pero invisible desde los labels de sidebar/grupo, y completamente ausente del formulario de "configuración completa" que dice ser exhaustivo).

---

## Redundancia entre paneles encontrada

*(excluyendo el tema de WhatsApp/teléfono/email/redes sociales, ya cubierto por el diseño aprobado)*

1. **Tarjetas de marketing "Especialistas" vs. registros reales de Staff/Profesional** — `AdminHomepageSpecialistsPanel.tsx` (`fullName`, `specialty`, `bioShort`, foto → `HomepageSpecialist`) duplica a las mismas personas reales ya modeladas en `ProfessionalProfile`/`User` bajo `app/portal/admin/staff/page.tsx` → `AdminProfessionalsPanel`. No existe puente de importación (a diferencia de Servicios abajo), así que nombre/especialidad se tipea dos veces a mano sin ningún mecanismo de sincronización.
2. **Tarjetas de marketing "Catálogo de servicios" vs. catálogo clínico de Service** — `AdminHomepageServicesPanel.tsx` (`title`, `description`, `iconKey`, `highlights[]` → `HomepageService`) duplica `Service` (`prisma/schema.prisma:258-272`, nombre/descripción/precio/duración, gestionado en `admin/services`). Un botón "Importar" de una sola vez y un solo sentido (`AdminHomepageServicesPanel.tsx:296-328`) copia `title`+`description` solo al momento de crear — después de eso, los dos registros pueden desviarse en silencio (renombrás el servicio clínico, la tarjeta de marketing se queda con el nombre viejo).
3. **`showSpecialists` / `showCampaigns` viven en `HomepageSettings` pero se editan desde dos paneles CRUD no relacionados, no desde el formulario de settings que dice cubrir "todo en un solo lugar"** — `SectionVisibilityToggle` dentro de `AdminHomepageSpecialistsPanel.tsx:180-186` y `AdminCampaignsPanel.tsx:184-190`, ambos escribiendo a `/api/admin/homepage/settings`, mientras que el propio array `SECTIONS` de `AdminHomepageSettingsPanel.tsx` (`:137-273`) nunca expone ninguno de los dos campos. Es un caso genuino de "misma tabla, dos superficies de escritura desconectadas, una de ellas incompleta", distinto de la fragmentación de WhatsApp/canales ya resuelta.

## Agrupamientos / nombrado confuso

- **"Configuración completa"** (`ContentSidebar.tsx:14-15`) está agrupado bajo **"Marca / Header"** aunque su contenido abarca hero, servicios, especialistas, agenda, contacto, y copy de SEO — nada de lo cual es contenido de "marca/header". El label del grupo subestima lo que contiene el ítem.
- **10 de las 22 entradas de sidebar, repartidas en 5 grupos distintos** (Marca/Header, Hero, Servicios, Equipo, Agenda, Contacto/Footer), todas resuelven al mismo componente `AdminHomepageSettingsPanel` (`ContentShell.tsx:24-43`) — un admin navegando el sidebar no tiene ninguna pista visual de que "Textos del hero", "Encabezado de servicios", "Encabezado del equipo", "Textos de agenda", "Textos de contacto", "Barra superior", "Botones flotantes", "Identidad de marca", "SEO y metadatos", y "Configuración completa" son todos el mismo formulario, solo con scroll a un punto distinto.
- **"Canales de soporte"** (panel `ContactSupportItems` existente) vs. el nuevo **"Canales de comunicación"** (nombre del panel nuevo del diseño aprobado) — ambos van a usar "canal(es)" para tipos de contenido genuinamente distintos una vez que el rediseño salga; vale la pena un nombre distinto para uno de los dos para evitar que el sidebar se lea como duplicado.
- **"Sedes / ubicaciones"** — la descripción de sidebar promete campos de "dirección y horario" que no existen en el panel — solo tiene un textarea de texto libre `description` (`AdminHomepageLocationsPanel.tsx:8-14,172`).
- **"Redes sociales"** vive sola en su propio grupo de nivel superior "Redes", mientras que paneles funcionalmente similares de "cómo nos contactan los pacientes" ("Canales de soporte", "Botones flotantes") viven en el grupo separado "Contacto / Footer" — ningún label compartido une a los tres hoy (el nuevo grupo "Información de empresa" del diseño aprobado lo resuelve hacia adelante).

## Patrones de UI inconsistentes

- **Un formulario gigante vs. once listas CRUD limpias:** `AdminHomepageSettingsPanel.tsx` mete 46 campos no relacionados (identidad de marca, InfoBar, copy+testimonio+highlight del hero, copy de servicios, copy de especialistas, copy de agenda, copy de contacto, acciones flotantes, SEO) en un solo componente con un solo botón de guardado que envía todo a la vez, mientras que cada otro tipo de contenido (nav links, hero stats, servicios, especialistas, opciones/beneficios de agenda, redes sociales, ítems de soporte, sedes, enlaces legales, FAQ) tiene su propio panel CRUD dedicado, acotado, de propósito único, donde cada fila guarda de forma independiente. La fricción: editar una sección no relacionada del formulario gigante re-valida y re-envía los 46 campos juntos (`AdminHomepageSettingsPanel.tsx:341-364`), así que un problema de calidad de dato en, digamos, `contactEmail`, puede bloquear el guardado de una edición a `metaTitle`. Ninguno de los 11 paneles-lista tiene este acoplamiento — cada fila es su propio PATCH.
- **Campañas rompe la convención de lista-CRUD de una segunda forma:** `AdminCampaignsPanel.tsx` es el único panel que usa `Table` + buscador + editor modal en vez del patrón de lista-de-tarjetas-con-edición-inline que usan los otros 11 paneles-lista, a pesar de que Campaign tiene una cantidad/forma de campos similar a `HomepageService`/`HomepageSpecialist` (que sí usan el patrón de Card).
- **La selección de ícono es un `<select>` de enum crudo en todos lados donde aparece** (Servicios, BookingBenefits, ContactSupportItems, SocialLinks) — consistente consigo mismo, pero de baja fidelidad: el dropdown lista strings de clave de ícono pelados ("Sparkle", "CalendarCheck", "InstagramLogo") sin ningún preview visual del glifo, así que elegir el ícono correcto requiere prueba y error contra el sitio en vivo.

## Exceso / complejidad de bajo valor

- **`AdminHomepageBookingOptionsPanel.tsx`** es un panel CRUD completamente construido (crear/editar/borrar/reordenar, API dedicada, tabla dedicada) con cero efecto en el sitio público (ya registrado como muerto en la auditoría anterior) — marcado acá de nuevo solo como observación de *complejidad*: es exactamente tanta superficie de UI/API como cualquier panel "real", para una feature que nada renderiza actualmente.
- **Labels/placeholders en inglés dentro de un CMS en español, tú-form**, según la regla de CLAUDE.md de "contenido en español" para el portal: "Value"/"Label" en `AdminHomepageBookingOptionsPanel.tsx:171-172`, y "WhatsApp href"/"WhatsApp label"/"Email href"/"Email label" en `AdminHomepageSettingsPanel.tsx:154-157` — inconsistente con paneles hermanos que traducen los mismos conceptos ("Etiqueta" en `AdminHomepageNavLinksPanel.tsx:173`, `AdminHomepageSocialLinksPanel.tsx:175`).
- **`AdminBootstrapButton`** tiene un alcance ambiguo — una única acción de header siempre visible cuyo radio de impacto (cuáles de las 13 tablas / 46 campos toca) no se describe en ningún lado de la UI más allá del texto del `confirm()`.

## Observación estructural general

El sidebar se presenta como **9 grupos / 22 entradas**, pero la superficie editable real es **13 componentes React distintos**, porque 10 de esas 22 entradas son deep-links hacia un único formulario gigante (`AdminHomepageSettingsPanel`) y 2 más (`showSpecialists`/`showCampaigns`) no son alcanzables desde ninguna entrada de sidebar dedicada — están enterradas dentro de dos paneles CRUD sin relación aparente. Ese desajuste (22 destinos percibidos vs. 13 componentes reales, con 2 settings huérfanos de ambos) es la fricción estructural principal que un rediseño debería resolver, independiente de la unificación de canales/información de empresa ya aprobada: o el formulario gigante se rompe en paneles que mapeen 1:1 con los grupos del sidebar (así "Hero" → un panel de hero, no "Hero" más un slug `hero-copy` enterrado dentro de "Configuración completa"), o el sidebar deja de fingir que hay 10 destinos separados de "copy" de hero/servicios/especialistas/agenda/contacto cuando todos son el mismo formulario.

Por separado, la auditoría reveló que la "redundancia de contenido" en este CMS no es solo sobre WhatsApp/teléfono/email (ya en vías de arreglo) — también existe a nivel de *entidad*, donde listas orientadas a marketing (Especialistas, Catálogo de servicios) duplican datos operacionales reales (registros de Staff/Profesional, catálogo clínico de Service) que viven completamente afuera de `/portal/admin/content`, con solo uno de esos dos pares (Servicios) teniendo siquiera un puente de importación manual. Un rediseño que solo toque labels de sidebar y layout de formulario adentro de `/content` no va a resolver esa mitad del problema de redundancia, ya que la segunda copia del dato vive en un módulo admin completamente distinto.
