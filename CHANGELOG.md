# Changelog

## 2.0.3

### Patch Changes

- f46887d: Los horarios libres de hoy ya no se corren ni cambian de ID cuando se regenera el inventario (cambios de agenda, festivos o CUPS): la grilla parte de la hora de inicio del turno. Antes una reserva en curso podía recibir "Slot no encontrado" (DOG-65).

## 2.0.2

### Patch Changes

- 1e44828: Las reseñas de Google del hero ya no se salen de la pantalla en celulares de 320 px (DOG-66).

## 2.0.1

### Patch Changes

- 9022d14: CI estable: los E2E del dashboard admin esperan solo el título visible (el streaming de React lo muestra un instante duplicado en un contenedor oculto), CodeQL usa la misma versión en `init` y `analyze` (v4.39.4) y `changesets/action` pasa a v2.1.2.
- 11e172e: El script `encrypt-existing-fields` ahora cifra también los secretos de verificación en dos pasos (`UserMfa`), cuya clave primaria es `userId` y no `id`. Antes fallaba al llegar a esa tabla.
- ace2ff0: El script de cifrado de datos existentes tiene tests: comprueba contra el esquema de Prisma la clave primaria de cada modelo cifrado y la paginación por esa clave (DOG-53).
- 12de7f5: Las imágenes del CMS se suben a un store de Blob público propio (`CMS_BLOB_READ_WRITE_TOKEN`), separado del store privado de adjuntos clínicos (DOG-54).
- d4cb887: Saneamiento: se elimina una función sin uso, se quitan exports que solo usa su propio archivo y knip deja de contar los tipos usados en las firmas de su módulo (DOG-60).
- f10df36: El sitio público se ve bien en celulares de 320 a 390 px: el hero y el contacto ya no se salen de la pantalla, el encabezado es más compacto, el menú móvil tiene fondo opaco, queda un solo botón flotante y el aviso de cookies cabe a 320 px (DOG-62).
- ebfcb97: Textos del sitio regionalizados para Colombia: "atención al paciente" en vez de "Patient Care", y horarios por defecto en 24 h con raya (9:00–19:00, el horario real de la clínica) (DOG-63).

## 2.0.0

### Major Changes

- 8cd87f0: Verificación en dos pasos (DOG-28) obligatoria para administradores y profesionales: app autenticadora (TOTP), 10 códigos de respaldo de un solo uso y restablecimiento por otro administrador desde Usuarios. Con la contraseña sola no se accede al portal ni a la API hasta completar el segundo paso; inscripciones, verificaciones, fallos, uso de códigos de respaldo y restablecimientos quedan en auditoría. El secreto TOTP se guarda cifrado. Nueva migración `dog28_mfa`.
  
  **Cambio mayor:** desde este release todo administrador y profesional debe activar la verificación en dos pasos en su siguiente ingreso; con la contraseña sola ya no entra al portal.

### Minor Changes

- 8cd87f0: Timeouts y cola de correos (DOG-13): los correos de citas y de restablecimiento de contraseña se guardan en una cola en Postgres (cuerpo cifrado) y se envían después de responder, con 3 reintentos inmediatos y reintento diario desde el cron; los errores definitivos y los correos vencidos no se reintentan. Timeouts explícitos en SMTP, Resend, Google Places y Vercel Blob.
- 8cd87f0: Protección invisible contra bots con Vercel BotID (DOG-17) en el login, el registro y el restablecimiento de contraseña. El rate limit existente sigue como segunda capa.
- 8cd87f0: Cifrado en reposo de los datos sensibles (DOG-18) con AES-256-GCM: teléfono, documento, dirección y aseguradora del paciente; notas de citas y notas clínicas; motivo, notas, diagnóstico y plan de los episodios; alergias y prescripciones. El documento se busca por hash exacto y las notas clínicas se filtran tras descifrar. Incluye un script idempotente para cifrar los datos existentes y rotar la clave.
- 8cd87f0: Iconos animados en todo el sitio (DOG-30): cada icono usa su animación propia de AnimateIcons y se anima al pasar el cursor o llegar con el teclado al botón, enlace o tarjeta que lo contiene. Los iconos que comparten lugar (menú, tema y mostrar u ocultar) se transforman de uno a otro con Morphicons. Ambos respetan la preferencia de movimiento reducido.
- 8cd87f0: Campos de normativa de salud colombiana (DOG-34):
  
  - Paciente: tipo de documento con los códigos de la tabla RIPS (CC por defecto) en el registro inicial, el perfil, recepción y el panel de administración. Las fichas y las recetas muestran el documento como `CC 1020304050`.
  - Profesional: número RETHUS opcional al crear el perfil. Mientras falte, el portal del profesional muestra un aviso y el panel de usuarios una etiqueta "Sin RETHUS". Sale en las recetas impresas.
  - Servicio: los códigos CUPS se manejan desde el catálogo CUPS del admin (ver DOG-42).
- 8cd87f0: Testimonios del hero como pila de tarjetas superpuesta al pie de la foto (DOG-35): se descartan arrastrando, con flechas, puntos y teclado, avance automático con pausa al pasar el cursor, respeto por `prefers-reduced-motion` y estrellas doradas. Se corrigió además que el dorado de las estrellas nunca se aplicaba (el color no estaba registrado en Tailwind).
- 8cd87f0: Aviso de cookies (DOG-36): barra compacta no modal con "Aceptar todo", "Solo esenciales" y "Personalizar" (panel en `<dialog>` nativo), enlace "Gestionar cookies" en el pie de página y nueva sección 12 "Cookies y almacenamiento local" en la política de datos. El mapa de Google Maps de contacto queda detrás de una fachada y solo carga (con sus cookies) si la persona lo acepta.
- 8cd87f0: Páginas de detalle de servicios (DOG-37): cada servicio del CMS elige su página en /servicios/[slug] (o ninguna) en lugar de depender del nombre exacto, y la tarjeta muestra el enlace «Conoce el tratamiento». El dominio por defecto para canonical, sitemap, robots y datos estructurados pasa a ser el de producción, el sitemap ya no incluye anclas (#) y el contenido público usa tuteo en vez de voseo. Los alias de rol del portal (/portal/paciente, /portal/administrador...) redirigen al portal real en lugar de mostrar una vista antigua.
- 8cd87f0: Catálogo CUPS en el admin: los 177 procedimientos odontológicos de la Resolución 2706 de 2025, agrupados por área en un árbol. La clínica marca los que presta, elige con qué servicio se agenda cada uno y qué profesionales lo realizan; si un profesional no tenía ese servicio en la agenda, se le asigna. Reemplaza el campo único "Código CUPS" del servicio, que no alcanzaba para servicios con varios códigos como endodoncia u ortodoncia.

### Patch Changes

- 8cd87f0: Unificar el portal con el shell glassy del admin para recepción, profesional y paciente (`PortalGlassShell`), pasar toda la navegación y los textos del portal a español y quitar el tema oscuro forzado del profesional (DOG-10).
- 8cd87f0: Rendimiento de la capa de datos (DOG-11): índices compuestos en notificaciones, listado de adjuntos del profesional acotado a los 100 más recientes y consulta de última visita reducida a las columnas necesarias.
- 8cd87f0: Rendimiento percibido del portal (DOG-12): skeletons accesibles en lugar de textos "Cargando…" y `loading.tsx` para todo el portal; debounce en el buscador de la agenda de recepción y cancelación de búsquedas viejas en los buscadores globales; consultas independientes en paralelo en la ficha del paciente y la impresión de episodios; actualización optimista (con reversión) al cambiar el estado de una cita y al leer o borrar notificaciones; el dashboard del profesional ya no recarga la agenda al elegir otra cita ni autoguarda notas sin cambios. `fetchWithTimeout` conserva su timeout cuando se le pasa un `signal`.
- 8cd87f0: Caché de catálogos (DOG-14): el home, las campañas activas, la lista de servicios y la de especialidades se leen de la caché de datos de Next en lugar de consultar la base en cada visita. Cualquier escritura en esos modelos invalida la caché al instante; además vence sola a los 5 minutos. No hizo falta Redis.
- 8cd87f0: Higiene del bundle (DOG-15): se quitan dependencias sin uso (`jose`, `pino`, `@types/bcryptjs`, `eslint-config-next`), las imágenes se sirven en AVIF con WebP de respaldo, y se borra código muerto (`/api/admin/metrics/appointments` y `app/portal/admin/_data/dashboard.ts`).
- 8cd87f0: Auditoría de seguridad (DOG-16): Sentry ahora se inicializa en el servidor cuando hay `SENTRY_DSN` y limpia cada evento antes de enviarlo (sin cuerpo, cookies, query ni datos clínicos). Los logs también ocultan alergias, diagnósticos, prescripciones, documentos y datos de aseguradora. La disponibilidad pública tiene rate limit y un rango máximo de 31 días.
- 8cd87f0: Endurecer la validación de entradas (DOG-19): zod en el cambio de estado de citas, paginación con tope en la analítica de recepción, verificación de la firma real de las imágenes que sube el admin, sanitización de las plantillas HTML también al mostrarlas y escape seguro del JSON-LD en `/servicios`.
- 8cd87f0: Escaneo de secretos con gitleaks en cada PR y push a `main`, más una pasada semanal (DOG-20). Nuevo comando local `pnpm secrets:scan` y `.gitignore` ampliado para llaves y archivos de credenciales.
- 8cd87f0: Tests de contrato por rol (DOG-22): una matriz que llama a 23 handlers de APIs críticas (admin, recepción, paciente, profesional y clínica) con cada rol y sin sesión. Confirma que sin sesión responden 401, que un rol no permitido recibe 403 sin tocar la base y que los roles permitidos pasan la autorización.
- 8cd87f0: Selectores de catálogo completos (DOG-23): los selectores de profesionales y servicios de recepción, reservas y agenda del admin ahora traen todas las páginas con `fetchAllPages`. Antes pedían una sola página y, por el tope de 50 del servidor, lo que pasara de 50 desaparecía sin aviso (incluso donde se pedía `pageSize=100`).
- 8cd87f0: Docs (DOG-24): tabla de responsables por módulo en `docs/ARCHITECTURE_MAP.md` (área, archivos clave y tests que lo cubren), y `docs/IMPROVEMENTS_BACKLOG.md` al día.
- 8cd87f0: QA en celular (DOG-26): se corrigen contenidos que se salían de la pantalla a 320–390 px. Afectaba al panel de agendamiento del home, al calendario del dashboard de recepción (medía 793 px y la flecha de mes quedaba fuera), a la agenda base del admin, al eje de la gráfica del admin y al logo del portal, que quedaba tapado por los iconos.
- 8cd87f0: Limpieza con knip (DOG-27): se borran 8 archivos sin ningún import (`ChartSpark`, `StatusDot`, `ReceptionistPanel`, `components/ui/Modal`, `lib/api/{client,index,patients}` y `lib/availability.ts`) y la dependencia `rrule`. Se agrega `knip.jsonc` con las excepciones justificadas para que las próximas corridas salgan limpias.
- 8cd87f0: Buscador de pacientes del profesional (DOG-29): en Documentos y Resultados de laboratorio, el selector que cargaba solo los primeros 50 pacientes pasa a ser un buscador en el servidor (nombre, apellido, correo o código), usable con teclado y con estados de carga, vacío y error.
- 8cd87f0: Saneamiento del repositorio (DOG-31):
  - Se borran 54 fuentes Inter estáticas sin uso (~18,6 MB), la carpeta `migrations/` de SQLite, las notas de Jules y el panel viejo `app/(dashboard)`, que capturaba cualquier URL de un solo segmento antes del 404.
  - Se borra código muerto: exports, iconos y una función de analytics que nadie usa. Los símbolos que solo se usan dentro de su archivo dejan de exportarse.
  - Documentación: los reportes de seguridad de agosto quedan resumidos en `docs/security/HISTORIAL.md`, se borran los planes ya ejecutados, se unen los runbooks de backup y se actualizan README, E2E, deploy y CLAUDE.md.
- 8cd87f0: Los adjuntos clínicos nuevos se guardan bajo `clinical-private/`. Producción no tenía adjuntos clínicos que migrar, así que se retiró el script de migración de adjuntos viejos (DOG-32).
- 8cd87f0: Los adjuntos clínicos ahora se validan por su contenido real (magic bytes) además del tipo que declara el navegador: un archivo que no es un PDF, JPG, PNG o WEBP de verdad se rechaza con un 400 y un mensaje en español, tanto en la subida de archivos del historial clínico como en los adjuntos embebidos (dataUrl) de las citas. El panel del profesional muestra el motivo del rechazo (DOG-33).
- 8cd87f0: Crédito "Desarrollado por DOGBYTE" en todas las páginas: home, páginas de servicios, inicio de sesión y registro, recuperación de contraseña, políticas legales, nueva cita y el portal de los cuatro roles. DOGBYTE va siempre en mayúsculas y con Outfit (DOG-38).
- 8cd87f0: Reservas más estables (DOG-39):
  
  - Regenerar el inventario de horarios ya no borra y recrea los horarios libres que no cambiaron: conservan su ID. Antes, un paciente que elegía un horario mientras se regeneraba el inventario recibía "Slot no encontrado" (404).
  - Si otra persona reserva el mismo horario un instante antes, la API responde 409 con "Ese horario acaba de ser reservado. Elige otro horario." en vez del genérico "No se pudo crear la cita.".
- 8cd87f0: Auditoría de plataforma web (DOG-40). Los 12 modales del portal pasan a `<dialog>` nativo con `showModal()` a través de `PortalDialog`: foco atrapado, página inerte, Esc y retorno del foco los da el navegador, y desaparecen `useModalDialog` y los overlays `fixed inset-0` hechos a mano. Todas las fechas y horas de citas, registros, correos e impresiones se muestran en hora de Bogotá (`CLINIC_TIME_ZONE`) aunque se rendericen en el servidor de Vercel, que corre en UTC. Formularios: `autocomplete` correcto en login, registro y cambio de contraseña, labels asociados en cambio de contraseña y Enter del buscador global seguro con IME. `toSorted` y `Object.groupBy` en lugar de copias y reduce manuales. Política de soporte de navegadores en `CLAUDE.md`.
- 8cd87f0: Documentar que el entorno local usa la branch Dev de Neon, con una base shadow de Prisma propia (`prisma_shadow`) separada de la base de trabajo (DOG-41).
- 8cd87f0: `pnpm db:seed` vuelve a funcionar con Prisma 7: el comando del seed pasa a `prisma.config.ts` y corre con `tsx`, que resuelve los alias `@/...`. Se retira `ts-node`.
- 8cd87f0: Seguridad (DOG-6): el secreto de autenticación se resuelve en un único helper (`lib/auth/secret.ts`) que trata las variables vacías como ausentes. Antes, un `AUTH_JWT_SECRET` definido pero vacío hacía que `proxy.ts` ignorara `NEXTAUTH_SECRET` y lanzara un error en todas las rutas protegidas en producción.
- 8cd87f0: Reactivar los deploys de preview de `develop` en Vercel: se confirmó que el ambiente Preview usa la rama Dev de Neon (DOG-7).
- 8cd87f0: Base de datos (DOG-9): las consultas de cada conexión de pg se serializan. El intérprete de Prisma 7 lanza en paralelo las subconsultas de `include` y lotes dentro de una transacción, que comparte una sola conexión; pg 8 las encolaba con un aviso de deprecación y pg 9 las rechazará con un error. Además, `pnpm e2e:local` ahora deja pasar `NODE_OPTIONS` para depurar.
- 8cd87f0: El contenido del sitio público se lee con consultas independientes en lugar de una transacción, que fallaba con "Unable to start a transaction in the given time" cuando la base tardaba en responder (build con muchos workers o Neon en frío). Las páginas de servicios ahora usan el contenido por defecto si la base no responde, igual que el home. También se corrige un test de cifrado intermitente.
- 8cd87f0: Flujo de trabajo local: rama `develop`, E2E locales en Postgres efímero de Docker aislados de `.env.local` (`pnpm e2e:local`, `pnpm e2e:local:smoke`), Dependabot mensual y agrupado, y sin deploys de Vercel para `develop`.

## [Unreleased]
- Eliminado `vercel.json` inválido y actualizado Prisma/CI para despliegues y builds estables.
