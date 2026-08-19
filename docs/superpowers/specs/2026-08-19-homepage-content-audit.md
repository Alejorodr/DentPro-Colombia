# Homepage → Admin Content CMS Audit

**Fecha:** 2026-08-19
**Propósito:** Mapa completo de todo lo que renderiza la home pública (`app/page.tsx` y cada componente que consume), de dónde saca su contenido, y si ese contenido es editable hoy desde `/portal/admin/content`. Esto es el insumo para la reorganización de Contenido — es un audit, no un plan de acción. Antes de tocar código, esto queda como referencia.

**Alcance cubierto:** `app/page.tsx`, todos los componentes bajo `app/(marketing)/components/`, `lib/marketing/homepage.ts`, `homepage-types.ts`, `homepage-adapter.ts`, `homepage-defaults.ts`, `prisma/schema.prisma` (modelo `HomepageSettings`), `app/api/admin/homepage/settings/route.ts`, y cada panel/shell bajo `app/portal/admin/content/`.

---

## Page-level structured data (file: `app/page.tsx`)

**Renderiza:** dos bloques `<script type="application/ld+json">` (schema Dentist + FAQPage condicional) inyectados antes de `InfoBar`.

**Piezas de contenido:**
- `name`, `telephone` (`homepageContent.contact.channels[0].value`), `email` (`channels[2].value`), `description` — fuente: CMS (campos `contact`/`seo`) con fallbacks hardcodeados (`"+573237968435"`, `"dentprocolombia@gmail.com"`, descripción genérica) — `app/page.tsx:64-70` — editable hoy: sí, vía "Textos de contacto"/"SEO y metadatos", pero los fallbacks en sí están hardcodeados y pueden desviarse de los defaults del CMS.
- `address` (streetAddress, locality, region, country) — fuente: objeto literal hardcodeado, `app/page.tsx:71-77` — editable hoy: no, sin superficie CMS. Duplica los campos de texto libre editables por CMS (`contactAddress`/`infoBarLocation`) con una versión estructurada separada — las dos pueden desincronizarse en silencio.
- `geo` (`latitude`/`longitude`) — hardcodeado, `app/page.tsx:78-82` — editable hoy: no, sin superficie CMS (técnico pero plausiblemente relevante si la clínica se muda).
- `openingHoursSpecification` — hardcodeado (Lun-Sáb 08:00-19:00), `app/page.tsx:83-90` — editable hoy: no. Duplica `infoBarHours`/`bookingScheduleNote`, que SÍ son editables por CMS, así que el horario del JSON-LD puede desviarse en silencio del texto visible del InfoBar.
- `sameAs` (URLs Instagram/Facebook/TikTok) — array hardcodeado, `app/page.tsx:91-95` — editable hoy: no. Duplica los registros de `HomepageSocialLink` (SÍ editables por CMS vía "Redes sociales") con una copia hardcodeada aparte.
- `priceRange: "$$"` — hardcodeado, `app/page.tsx:96` — editable hoy: no; plausiblemente un admin querría cambiarlo.
- `aggregateRating` — fuente: `getGoogleReviews()` (API externa Google Places, no CMS) — `app/page.tsx:97-105`.
- `faqJsonLd` — fuente: `homepageContent.faqs` (CMS, "Preguntas frecuentes") — `app/page.tsx:108-119` — editable hoy: sí.

**Hallazgos:** el JSON-LD `Dentist` (address/geo/horario/sameAs) es una segunda fuente de verdad hardcodeada que duplica varios campos editables por CMS (texto de ubicación, texto de horario, redes sociales) sin leerlos nunca. Si un admin actualiza la ubicación del InfoBar o las redes sociales, el markup schema.org queda desactualizado en silencio.

---

## InfoBar (file: `app/(marketing)/components/InfoBar.tsx`)

**Renderiza:** barra superior con ubicación, horario, badge de calificación de Google, link de WhatsApp, link de email, e íconos sociales.

**Piezas de contenido:**
- `location.text` — fuente: `infoBar.location.text` ← `settings.infoBarLocation` — `lib/marketing/homepage.ts:79-82` — editable hoy: sí, vía "Barra superior".
- `location.icon` — hardcodeado a `"MapPin"` en el pipeline, `lib/marketing/homepage.ts:81` — editable hoy: no (ícono fijo, no expuesto como opción para este campo).
- `schedule.text` — fuente: `infoBar.schedule.text` ← `settings.infoBarHours` — editable hoy: sí, vía "Barra superior".
- `schedule.icon` — hardcodeado `"Clock"`, `lib/marketing/homepage.ts:85` — no editable.
- `whatsapp.href`/`label` — fuente: `settings.infoBarWhatsappHref`/`infoBarWhatsappLabel` — editable hoy: sí, vía "Barra superior". Nota: es un número de WhatsApp *separado* del `floatingWhatsappNumber` (botón flotante) y del `contactWhatsapp` (footer) — tres campos independientes que pueden desincronizarse.
- `email.href`/`label` — fuente: `settings.infoBarEmailHref`/`infoBarEmailLabel` — editable hoy: sí, vía "Barra superior".
- `socials[]` (ícono+href+label) — fuente: tabla `HomepageSocialLink` — editable hoy: sí, vía "Redes sociales" (`social`). Esta lista se comparte literalmente entre InfoBar y el footer de Contacto (`lib/marketing/homepage.ts:97-104` y `224-231` leen el mismo resultado de query `socials`) — un edit afecta ambos lugares, no se pueden personalizar por separado.
- `googleRating` (rating/count/url) — fuente: `getGoogleReviews()`, API externa de Google Places — `app/page.tsx:135-143` — editable hoy: N/A, no es contenido CMS (dato externo en vivo, sin superficie CMS, sin forma de ocultarlo/configurarlo desde admin).

**Hallazgos:** nada muerto; cada campo renderizado tiene un consumidor real. El badge de calificación de Google no tiene ningún control desde el CMS (no se puede ocultar/configurar desde admin).

---

## Navbar (file: `app/(marketing)/components/Navbar.tsx`)

**Renderiza:** header sticky con logo/nombre de marca, links de navegación desktop, toggle de tema, botón de login, botón de CTA principal, menú mobile.

**Piezas de contenido:**
- `brand.name`, `brand.initials`, `brand.logoUrl` — fuente: `brand` ← `settings.siteName`/`logoUrl` (iniciales auto-derivadas) — `lib/marketing/homepage.ts:64-76` — editable hoy: sí, vía "Identidad de marca".
- `brand.href` — hardcodeado `"#inicio"` en page.tsx, `app/page.tsx:51` — editable hoy: no (ancla estructural, está bien así).
- `links[]` (menú de nav) — fuente: tabla `HomepageNavLink` — editable hoy: sí, vía "Navbar".
- `cta` (`NAV_CTA` = `{ href: "/appointments/new", label: "Reservar turno" }`) — constante hardcodeada, `app/page.tsx:37` — editable hoy: no. Copy plausiblemente editable (un admin podría querer cambiar el label/ruta del botón).
- `login` (`NAV_LOGIN` = `{ href: "/auth/login", label: "Iniciar sesión" }`) — constante hardcodeada, `app/page.tsx:38` — editable hoy: no. Igual que arriba — un admin de clínica podría querer reescribir esto.
- `ThemeToggle` — componente importado, `Navbar.tsx:8` — N/A, UI puramente estructural (switch claro/oscuro), no contenido.

**Hallazgos:** nada muerto. El CTA principal y el botón de login (posiblemente los dos botones de conversión más importantes de todo el sitio) están totalmente hardcodeados y no los toca ninguna de las 15 secciones del CMS, a diferencia de los CTAs del Hero que visualmente son similares y SÍ son editables.

---

## Hero (file: `app/(marketing)/components/Hero.tsx`) — con `HeroGoogleReviewRotator.tsx` anidado

**Renderiza:** título, descripción, dos botones CTA, tres callouts de estadísticas, imagen hero, y una tarjeta de testimonio/review de Google.

**Piezas de contenido:**
- `title` — fuente: `hero.title` ← `settings.heroTitle` — editable hoy: sí, vía "Textos del hero" (`hero-copy`).
- `description` — fuente: `hero.description` ← `settings.heroDescription` — editable hoy: sí.
- `primaryCta`/`secondaryCta` (href+label) — fuente: `hero.primaryCta`/`secondaryCta` ← `settings.heroPrimaryButtonText/Href`, `heroSecondaryButtonText/Href` — editable hoy: sí.
- `stats[]` (label+description, hasta 3 renderizados) — fuente: tabla `HomepageHeroStat` — editable hoy: sí, vía "Estadísticas hero".
- `image.src`/`alt` — fuente: `hero.image` ← `settings.heroImageUrl`/`heroImageAlt` — editable hoy: sí, vía "Textos del hero" (campo de imagen embebido en la misma sección).
- `testimonial` (quote/author/role/avatar) — fuente: `hero.testimonial` ← `settings.heroTestimonial*` — editable hoy: sí, vía "Textos del hero"; se renderiza como fallback por `HeroGoogleReviewRotator.tsx:50-71` solo cuando no hay reviews de Google en vivo.
- `googleReviews` — fuente: `getGoogleReviews()` (API externa) — N/A, no es contenido CMS; cuando existe reemplaza por completo al testimonio del CMS y rota entre reviews en vivo (`HeroGoogleReviewRotator.tsx:24-202`).
- **`badge`** — declarado en la interfaz `HeroContent` (`Hero.tsx:20`), correctamente poblado de punta a punta por el pipeline (`settings.heroBadge` → `hero.badge` en `homepage.ts:111` → `marketingContent.hero.badge` en el adapter → pasado como prop vía `{...marketingContent.hero}` en `app/page.tsx:148`), y editable en el admin UI ("Textos del hero" → "Badge", `AdminHomepageSettingsPanel.tsx:165`) — **pero la firma de función de `Hero.tsx` nunca desestructura `badge`** (`Hero.tsx:40-49`), así que se descarta en silencio y nunca se renderiza en ningún lado de la página.
- **`highlight` (título+descripción)** — misma situación: totalmente modelado en `HomepageNormalizedContent["hero"]["highlight"]` (`homepage-types.ts:120`), poblado desde `settings.heroHighlightTitle`/`heroHighlightDescription` (`homepage.ts:136-139`), pasado por el adapter sin tocar (`hero: content.hero` en `homepage-adapter.ts:61`), y tiene un admin UI dedicado y completo ("Textos del hero" → "Highlight título"/"Highlight descripción", `AdminHomepageSettingsPanel.tsx:178-179`) — pero la interfaz `HeroContent` de `Hero.tsx` lo declara (`Hero.tsx:12-17,36`) y el componente nunca lo desestructura ni renderiza.

**Hallazgos:** `badge` y `highlight` son dos piezas de contenido totalmente editables por CMS, totalmente conectadas en el pipeline, con **cero efecto visual** en la home en vivo — un admin que edita "Textos del hero" ve "guardado correctamente" y nada cambia en el sitio. `HeroGoogleReviewRotator` en sí no tiene contenido muerto — cada rama que renderiza está respaldada por datos de testimonio del CMS o datos en vivo de Google.

---

## CampaignCarousel (file: `app/(marketing)/components/CampaignCarousel.tsx`)

**Renderiza:** scroll horizontal condicional de tarjetas de campañas promocionales activas (imagen, título, descripción, CTA).

**Piezas de contenido:**
- Todos los campos (`title`, `description`, `imageUrl`, `ctaText`, `ctaUrl`) — fuente: modelo Prisma **`Campaign`**, consultado directamente dentro del server component (`CampaignCarousel.tsx:20-36`) — esto es **completamente separado de `HomepageNormalizedContent`/`getHomepageContent()`**; no pasa por `lib/marketing/homepage.ts` ni por el adapter.
- Compuerta de visibilidad `homepageContent.showCampaigns` — fuente: CMS (`HomepageSettings.showCampaigns`) — editable hoy: sí, vía el `SectionVisibilityToggle` embebido dentro de `AdminCampaignsPanel.tsx:184-190` (alcanzable vía el item "Campañas" del sidebar, no vía "settings").
- Encabezado de sección "Promociones destacadas" / "Actualizado hoy" — strings literales hardcodeadas, `CampaignCarousel.tsx:46,48` — editable hoy: no; copy plausiblemente editable.

**Hallazgos:** nada muerto — las campañas tienen su propio CRUD completo vía `AdminCampaignsPanel.tsx`, correctamente conectado a `/api/campaigns`.

---

## ServicesSection (file: `app/(marketing)/components/Services.tsx`)

**Renderiza:** encabezado de sección (badge/título/descripción) más una grilla de tarjetas de servicio (ícono, título→link, descripción, bullets de highlights, botón "Reservar cita").

**Piezas de contenido:**
- `title` — fuente: `services.title` ← `settings.servicesTitle` — editable hoy: sí, vía "Encabezado de servicios" (`servicios-copy`).
- `description` — fuente: `services.description` ← `settings.servicesDescription` — editable hoy: sí.
- **`badge`** — declarado como opcional tanto en `HomepageNormalizedContent["services"]["badge"]` (`homepage-types.ts:123`) como en `ServicesProps` (`Services.tsx:27`), correctamente desestructurado y renderizado condicionalmente por el componente (`Services.tsx:33,38`), y `HOMEPAGE_DEFAULT_CONTENT.services.badge = "SERVICIOS"` existe (`homepage-defaults.ts:65`) — **pero `getHomepageContent()` nunca setea una key `badge` en el objeto `services` que retorna** (`lib/marketing/homepage.ts:141-156`), y no existe ningún campo `servicesBadge` en la sección "servicios" de `AdminHomepageSettingsPanel` (`AdminHomepageSettingsPanel.tsx:183-190` solo tiene `servicesTitle`/`servicesDescription`) ni en el modelo Prisma `HomepageSettings`. Resultado: el badge eyebrow "SERVICIOS" que se ve en el fallback de contenido por defecto nunca aparece una vez que la app está respaldada por base de datos — está permanentemente en blanco en producción, y no hay forma de setearlo desde el CMS.
- `services[]` (título, descripción, ícono, highlights[]) — fuente: tablas `HomepageService` + `HomepageServiceHighlight` — editable hoy: sí, vía "Catálogo de servicios" (CRUD completo incl. highlights, selector de ícono, reordenar).
- `SERVICE_HREFS` — tabla de lookup hardcodeada que mapea *strings exactos de título* de servicio a hrefs de rutas internas (`Services.tsx:10-17`), usada para decidir si un título de servicio se renderiza como `<Link>` o `<h3>` plano. Editable hoy: no. Es un mapa hardcodeado, con clave el string exacto del título — si un admin renombra un servicio vía CMS (ej. "Ortodoncia digital" → "Ortodoncia"), el link desaparece en silencio porque la clave ya no matchea, sin ningún aviso al admin.
- Botón "Reservar cita" — literal hardcodeado + href hardcodeado `/appointments/new`, `Services.tsx:73-75` — editable hoy: no; CTA estructural, baja prioridad para CMS.

**Hallazgos:** `services.badge` es un campo huérfano en ambos extremos — modelado y consumido en código, con default en `HOMEPAGE_DEFAULT_CONTENT`, pero nunca poblado por el pipeline respaldado por DB y nunca expuesto en el form admin. `SERVICE_HREFS` es un acoplamiento hardcodeado frágil entre contenido de copy editable y ruteo no editable.

---

## SpecialistsSlider (file: `app/(marketing)/components/SpecialistsSlider.tsx`)

**Renderiza:** sección condicional (badge/título/descripción) más un slider horizontal arrastrable/paginado de tarjetas de especialistas (foto, nombre, especialidad, descripción, "Reservar cita").

**Piezas de contenido:**
- `badge` — fuente: `specialists.badge` ← `settings.specialistsBadge` — editable hoy: sí, vía "Encabezado del equipo" (`especialistas-copy`); correctamente desestructurado y renderizado (`SpecialistsSlider.tsx:27,38`).
- `title`/`description` — fuente: `settings.specialistsTitle`/`specialistsDescription` — editable hoy: sí.
- `specialists[]` (nombre, especialidad, descripción, imagen src/alt) — fuente: tabla `HomepageSpecialist` — editable hoy: sí, vía "Especialistas" (CRUD completo incl. subida de imagen, reordenar).
- Compuerta de visibilidad `homepageContent.showSpecialists` — fuente: CMS (`HomepageSettings.showSpecialists`) — editable hoy: sí, vía el `SectionVisibilityToggle` embebido dentro de `AdminHomepageSpecialistsPanel.tsx:180-186` (alcanzable vía el item "Especialistas" del sidebar, no vía "settings").
- Mecánica del carrusel (hook `useSpecialistsCarousel` — índice, drag/translate, prev/next) — N/A, comportamiento de UI puramente estructural, no contenido.
- Botón "Reservar cita" por tarjeta — literal + href hardcodeados — N/A/estructural.

**Hallazgos:** nada muerto — este componente es un ejemplo limpio de conexión correcta con el CMS de punta a punta (campo de datos → pipeline → adapter → desestructurado → renderizado).

---

## BookingFormSection (file: `app/(marketing)/components/BookingForm.tsx`)

**Renderiza:** bloque "Agenda tu cita" de dos columnas — izquierda: panel con gradiente, CTA "Ver disponibilidad y reservar", slots de cita rápidos/en vivo, y nota de horario; derecha: lista de beneficios + tarjeta de callout "¿Tienes dudas?" con WhatsApp/teléfono.

**Piezas de contenido:**
- `title` — fuente: `booking.title` ← `settings.bookingTitle` — editable hoy: sí, vía "Textos de agenda" (`agenda-copy`).
- `description` — fuente: `booking.description` ← `settings.bookingDescription` — editable hoy: sí.
- `benefitsTitle` — fuente: `booking.benefitsTitle` ← `settings.bookingBenefitsTitle` — editable hoy: sí, vía "Textos de agenda".
- `benefits[]` (ícono+texto) — fuente: tabla `HomepageBookingBenefit` — editable hoy: sí, vía "Beneficios de agendar" (`benefits`).
- `scheduleNote` — fuente: `booking.scheduleNote` ← `settings.bookingScheduleNote` — editable hoy: sí, renderizado bajo "Horario" (`BookingForm.tsx:151-154`).
- **`selectLabel`** — declarado en `BookingFormProps` (`BookingForm.tsx:23`), poblado de punta a punta (`settings.bookingSelectLabel` → `booking.selectLabel`), y editable vía "Textos de agenda" (`bookingSelectLabel`, `AdminHomepageSettingsPanel.tsx:208`) — **pero no lo desestructura la función del componente** (`BookingForm.tsx:31-37`), así que está muerto. No existe ningún `<select>`/selector de tratamiento en ningún lado del markup renderizado — el componente evidentemente se refactorizó a una UI de "slots rápidos + WhatsApp" sin sacar este prop de la interfaz ni del campo del CMS.
- **`options[]`** (opciones del dropdown de tratamiento) — declarado en `BookingFormProps` (`BookingForm.tsx:24`), con fuente en la tabla `HomepageBookingOption`, tiene un **panel CRUD admin completo y dedicado** ("Opciones de agendamiento" / item `booking` del sidebar — `AdminHomepageBookingOptionsPanel.tsx`, crear/editar/borrar/reordenar completo) — pero nunca se desestructura ni renderiza en `BookingFormSection` (`BookingForm.tsx:31-37`). Este es el mismatch CMS/UI más grande encontrado: un admin puede gestionar por completo una lista de "opciones de agenda" creyendo que controla un selector en la home, y tiene **cero efecto** en nada visible.
- **`consentNote`** — declarado en `BookingFormProps` (`BookingForm.tsx:28`), poblado (`settings.bookingConsentNote` → `booking.consentNote`), editable vía "Textos de agenda" (`bookingConsentNote`) — no se desestructura/renderiza (`BookingForm.tsx:31-37`). No aparece ningún texto de consentimiento de privacidad en ningún lado de la sección de agenda a pesar de estar modelado, con default (`"Al enviar este formulario autorizas el tratamiento de tus datos..."`, `homepage-defaults.ts:198-199`), y editable por CMS.
- `quickSlots` — fechas placeholder calculadas client-side (próximos 3 días no-domingo) — lógica hardcodeada, `BookingForm.tsx:42-62` — N/A, fallback estructural, no contenido.
- Slots en vivo (`renderedSlots`) — obtenidos de `/api/public/slots` (backend de agenda, no CMS de marketing) — `BookingForm.tsx:64-98` — N/A, dato operacional.
- Callout "¿Tienes dudas?" — link de WhatsApp `https://wa.me/573237968435` y de teléfono `tel:+573237968435` — **literales hardcodeados**, `BookingForm.tsx:177-183` — editable hoy: no. Esto duplica los campos editables por CMS `floatingWhatsappNumber`/`floatingPhoneNumber` e `infoBarWhatsappHref`/`contactPhone` con otra copia más, independiente y hardcodeada, del mismo número de teléfono — un cuarto lugar donde se define el número de WhatsApp/teléfono en este código (InfoBar, canales de Contacto, FloatingActions, y este), tres de los cuales son editables por CMS y este no.

**Hallazgos:** `selectLabel`, `options[]`, y `consentNote` son tres piezas de contenido editables por CMS — una con panel CRUD dedicado completo — sin ningún consumidor de renderizado en `BookingFormSection`. El número de WhatsApp/teléfono en la tarjeta "¿Tienes dudas?" es una cuarta copia hardcodeada de info de contacto que existe en forma editable por CMS en otros lugares.

---

## FAQSection (file: `app/(marketing)/components/FAQSection.tsx`)

**Renderiza:** acordeón condicional (solo si `faqItems.length > 0`) de pares pregunta/respuesta.

**Piezas de contenido:**
- `items[]` (pregunta+respuesta) — fuente: tabla `HomepageFaq`, pasada directamente como `homepageContent.faqs` (evita el adapter por completo — no es parte de `HomepageViewModel`) — `app/page.tsx:47,153` — editable hoy: sí, vía "Preguntas frecuentes" (`faq`).
- Encabezado de sección "Preguntas frecuentes" / "Todo lo que necesitás saber" / subcopy — literales hardcodeados, `FAQSection.tsx:25-31` — editable hoy: no; copy plausiblemente editable (es el único encabezado de sección de toda la página que es completamente hardcodeado, en contraste con Services/Specialists/Booking/Contact que sí tienen sección "-copy" en el CMS).
- Estado abierto/cerrado del acordeón — comportamiento de UI estructural, N/A.

**Hallazgos:** el encabezado propio de la sección FAQ es el único encabezado de sección en toda la página que es totalmente hardcodeado en vez de estar manejado por CMS — inconsistente con los encabezados análogos en Services/Specialists/Booking/Contact, todos los cuales tienen secciones "-copy" en el CMS.

---

## ContactSection (file: `app/(marketing)/components/ContactSection.tsx`)

**Renderiza:** bloque de contacto de tres columnas (canales+redes, ítems de soporte al paciente, sedes+mapa embebido) más una barra de footer (copyright, links legales).

**Piezas de contenido:**
- `title`/`description` — fuente: `contact.title`/`description` ← `settings.contactTitle`/`contactDescription` — editable hoy: sí, vía "Textos de contacto" (`contacto-copy`).
- `channels[]` (Teléfono/WhatsApp/Email/Ubicación) — fuente: construido en `homepage.ts:196-223` desde `settings.contactPhone`, `contactWhatsapp`, `contactEmail`, `contactAddress`, con **íconos hardcodeados** por canal (`"Phone"`, `"WhatsappLogo"`, `"EnvelopeSimple"`, `"MapPin"`) y hrefs parcialmente cruzados: el `href` del canal de WhatsApp se construye desde `settings.floatingWhatsappNumber` (el número del *botón flotante*), no desde ningún campo específico de WhatsApp de esta sección — mientras que su texto de *valor* mostrado viene de `contactWhatsapp`. El form admin lo señala explícitamente: `AdminHomepageSettingsPanel.tsx:222-226` ("Este campo afecta el texto del bloque de contacto, no el botón flotante"). "Ubicación" no tiene `href` en absoluto así que nunca se renderiza como link (`ContactSection.tsx:80-87`). Editable hoy: sí (los cuatro valores), vía "Textos de contacto".
- `socials[]` — misma tabla compartida `HomepageSocialLink` que InfoBar (ver sección InfoBar arriba) — editable hoy: sí, vía "Redes sociales"; de nuevo, es una lista compartida, no configurable por separado según dónde se muestre.
- `supportTitle` — fuente: `settings.contactSupportTitle` — editable hoy: sí, vía "Textos de contacto".
- Subcopy fijo "Nuestro equipo de Patient Care está listo para acompañarte..." — literal hardcodeado, `ContactSection.tsx:112-114` — editable hoy: no; copy plausiblemente editable, sentado justo al lado del `supportTitle` que sí es editable por CMS.
- `supportItems[]` (ícono+texto) — fuente: tabla `HomepageContactSupportItem` — editable hoy: sí, vía "Canales de soporte" (`support`).
- `locationsTitle` — fuente: `settings.contactLocationsTitle` — editable hoy: sí, vía "Textos de contacto".
- `locations[]` (nombre+descripción) — fuente: tabla `HomepageLocation` — editable hoy: sí, vía "Sedes / ubicaciones" (`locations`).
- `mapEmbedUrl` — fuente: `settings.contactMapEmbedUrl`, sanitizado/con allow-list a hosts HTTPS de Google por `adaptHomepageContent` (`homepage-adapter.ts:39-51,54-56`) — editable hoy: sí, vía "Textos de contacto" (`contactMapEmbedUrl`), se renderiza como `<iframe>` solo si sobrevive el chequeo de allow-list.
- `brand` (nombre de copyright del footer) — fuente: `settings.contactBrand` — editable hoy: sí, vía "Textos de contacto".
- `currentYear` — calculado client-side (`new Date().getFullYear()`), `ContactSection.tsx:63` — N/A, estructural.
- `legalLinks[]` — fuente: tabla `HomepageLegalLink` — editable hoy: sí, vía "Enlaces legales" (`legal`).

**Hallazgos:** nada muerto del lado de los datos; cada campo que llega a este componente se renderiza. El subcopy del bloque de soporte es una oración hardcodeada sentada justo al lado de un título editable por CMS, lo cual es una inconsistencia digna de nota. El cruce de href/valor del canal de WhatsApp (valor de un campo, href de un campo "flotante" no relacionado) es una trampa de edición real ya señalada por el propio texto de ayuda del admin UI.

---

## FloatingActions (file: `app/(marketing)/components/FloatingActions.tsx`)

**Renderiza:** botones flotantes de posición fija — WhatsApp / llamar / "ir a agenda".

**Piezas de contenido:**
- Href del botón WhatsApp — fuente: `floatingActions.whatsappNumber` ← `settings.floatingWhatsappNumber`, normalizado a URL `wa.me` por `normalizeWhatsappHref()` en el adapter (`homepage-adapter.ts:34-37,72-77`) — editable hoy: sí, vía "Botones flotantes" (`floating`).
- Href del botón teléfono — fuente: `floatingActions.phoneNumber` ← `settings.floatingPhoneNumber`, normalizado a URL `tel:` por `normalizePhoneHref()` (`homepage-adapter.ts:26-32,78-83`) — editable hoy: sí, vía "Botones flotantes".
- Labels de botón WhatsApp/Teléfono ("Chat en WhatsApp" / "Llamar a DentPro") — literales hardcodeados en el adapter, `homepage-adapter.ts:73,81` — editable hoy: no.
- Botón "Ir a agenda" (href `#agenda`, label "Ir a agenda", ícono `CalendarCheck`) — completamente hardcodeado en el adapter, `homepage-adapter.ts:84-88` — editable hoy: no; no respaldado por ningún campo del CMS (es una tercera acción siempre presente sin toggle).
- Asignación de `className`/ícono por acción — hardcodeado, `homepage-adapter.ts:71-88` — N/A, estilizado estructural.

**Hallazgos:** nada muerto. Los tres labels de botón de acción flotante y la acción "Ir a agenda" están hardcodeados sin superficie CMS, mientras que los dos números de teléfono que manejan sus hrefs sí son editables por CMS — un patrón de editabilidad parcial (números editables, todo lo demás de los botones no).

---

## Resumen transversal

### Campos de contenido sin cobertura CMS (hardcodeados, sin superficie admin en absoluto)
- JSON-LD `address`, `geo`, `openingHoursSpecification`, `sameAs`, `priceRange` — `app/page.tsx:71-96`
- Href+label del botón CTA/login del Navbar (`NAV_CTA`, `NAV_LOGIN`) — `app/page.tsx:37-38`
- Tabla `SERVICE_HREFS` (título→ruta) de `Services.tsx` — `Services.tsx:10-17`
- Copy del botón "Reservar cita" en tarjetas de Services/Specialists — literal hardcodeado por tarjeta
- Encabezado de sección de CampaignCarousel ("Promociones destacadas" / "Actualizado hoy") — `CampaignCarousel.tsx:46,48`
- Encabezado/subcopy de FAQSection ("Preguntas frecuentes" / "Todo lo que necesitás saber" / oración de ayuda) — `FAQSection.tsx:25-31`
- Subcopy fijo del bloque de soporte de ContactSection ("Nuestro equipo de Patient Care está listo...") — `ContactSection.tsx:112-114`
- Literales de WhatsApp/teléfono "¿Tienes dudas?" de BookingForm (`https://wa.me/573237968435`, `tel:+573237968435`) — `BookingForm.tsx:177-183`
- Labels de botón de FloatingActions ("Chat en WhatsApp", "Llamar a DentPro") y toda la acción "Ir a agenda" — `homepage-adapter.ts:73,81,84-88`
- Asignaciones de ícono fijo de InfoBar/schedule (`MapPin`/`Clock` fijos) y de cada canal de Contact — `lib/marketing/homepage.ts:81,85,198-222`

### Campos definidos en el CMS sin ningún consumidor en ningún componente (huérfanos del lado de datos)
- `hero.badge` — poblado por el pipeline, editable vía "Textos del hero", nunca desestructurado/renderizado por `Hero.tsx:40-49`
- `hero.highlight.title`/`description` — poblado por el pipeline, editable vía "Textos del hero", nunca desestructurado/renderizado por `Hero.tsx:40-49`
- `booking.selectLabel` — poblado por el pipeline, editable vía "Textos de agenda", nunca desestructurado/renderizado por `BookingForm.tsx:31-37`
- `booking.options[]` — poblado por el pipeline, tiene panel CRUD admin dedicado completo ("Opciones de agendamiento"), nunca desestructurado/renderizado por `BookingForm.tsx:31-37` (no existe ningún `<select>` en el componente)
- `booking.consentNote` — poblado por el pipeline, editable vía "Textos de agenda", nunca desestructurado/renderizado por `BookingForm.tsx:31-37`
- `services.badge` — modelado, con default (`"SERVICIOS"`), y consumido por `Services.tsx` si está presente, pero `getHomepageContent()` nunca lo puebla (`homepage.ts:141-156`) *y* no hay campo admin para setearlo — roto en ambos lados (producción de datos y superficie CMS) simultáneamente.
- `HomepageSettings.infoBarPhone` (columna DB) — se escribe al popular (`homepage.ts:280`, `route.ts:165`), nunca se lee en `getHomepageContent()`, nunca se serializa/expone en el form admin (`serializeSettings`/`mapPayloadToUpdateData` de `route.ts`) — schema puro muerto.
- `HomepageSettings.contactHours` (columna DB) — misma situación: se escribe al popular (`homepage.ts:318`, `route.ts:203`), nunca se lee, nunca se expone en el form admin — schema puro muerto.

### Contenido hardcodeado que un admin de clínica plausiblemente querría editar
- Texto/links de los botones CTA/login del Navbar (`NAV_CTA`, `NAV_LOGIN`)
- Copy del encabezado/intro de FAQSection
- Subcopy de soporte "Patient Care" de ContactSection
- Labels de botón de FloatingActions
- El número de WhatsApp/teléfono en línea en la tarjeta "¿Tienes dudas?" de BookingForm
- Encabezado de sección de CampaignCarousel
- El address/horario/redes sociales del JSON-LD (ya que duplican — y pueden desviarse de — datos que el admin SÍ puede editar en otro lado)
- `priceRange` en el JSON-LD

### Cosas técnicas/estructurales hardcodeadas que deberían quedarse en código, no en CMS
- `ThemeToggle`, estado abierto/cerrado del menú mobile, lógica de sombra al hacer scroll en `Navbar.tsx`
- Mecánica de drag/translate/índice de `useSpecialistsCarousel`
- Lógica de timer de rotación/fade de `HeroGoogleReviewRotator`
- Fallback de generación de fechas `quickSlots` y fetch a `/api/public/slots` de BookingForm
- Helper de escape `safeJsonLd()` y el mecanismo de inyección de `<script>` JSON-LD en sí en `app/page.tsx`
- Lógica de sanitización `isSafeMapEmbedUrl`/`normalizePhoneHref`/`normalizeWhatsappHref` en `homepage-adapter.ts`
- Renderizado de íconos y layout de tarjetas de `Services.tsx`; el *mecanismo* de `SERVICE_HREFS` (aunque su contenido es un objetivo de edición plausible, ver arriba)
- Integración de Google Places reviews (`lib/google/google-reviews.ts`) — dato externo/en vivo, sin rol CMS por diseño

### Código muerto / exports sin usar encontrados
- `Hero.tsx`: props `badge` y `highlight` aceptados por el tipo del componente pero nunca desestructurados ni renderizados (`Hero.tsx:12-17,20,36,40-49`)
- `BookingForm.tsx`: props `selectLabel`, `options`, `consentNote` aceptados por `BookingFormProps` pero nunca desestructurados ni renderizados (`BookingForm.tsx:20-29,31-37`)
- `AdminHomepageBookingOptionsPanel.tsx` + toda su API/tabla DB de respaldo (`HomepageBookingOption`) — una feature CRUD completa y funcional sin ningún efecto en el sitio público
- Columnas Prisma `HomepageSettings.infoBarPhone` y `.contactHours` — se setean al crear el registro, nunca se leen en ningún lado, nunca se exponen vía `serializeSettings`/`mapPayloadToUpdateData` de la API admin (`app/api/admin/homepage/settings/route.ts`)
- Omisión de `services.badge` en `getHomepageContent()` de `lib/marketing/homepage.ts` — efectivamente un bug que causa que un campo modelado/con default nunca llegue a la página en el camino respaldado por DB
- Duplicación menor (no muerta, pero redundante): la unión `MarketingIconName` de `app/(marketing)/components/icon-types.ts` y `MARKETING_ICON_KEYS`/`MarketingIconKey` de `lib/marketing/homepage-types.ts` son dos listas mantenidas independientemente del mismo set de íconos — deben mantenerse sincronizadas a mano ya que no hay una única fuente compartida.

---

## Próximo paso

Este documento es el mapa de referencia. La decisión de qué arreglar (bugs de código muerto), qué exponer en el CMS (hardcodeado-pero-plausible), y cómo reorganizar `/portal/admin/content` en base a esto queda para la siguiente conversación de diseño — no se toca código todavía.
