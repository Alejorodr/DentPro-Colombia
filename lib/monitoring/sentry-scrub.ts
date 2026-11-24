import type { ErrorEvent, EventHint } from "@sentry/nextjs";

import { sanitizeString, sanitizeValue } from "@/lib/logger";

/** Encabezados que sí ayudan a depurar y no identifican a nadie. */
const SAFE_HEADERS = new Set(["user-agent", "content-type", "accept", "x-vercel-id", "x-request-id"]);

/**
 * `beforeSend` de Sentry (DOG-16): un error del portal puede arrastrar datos clínicos o de
 * identidad en el cuerpo de la petición, las cookies o el contexto. Se descarta el cuerpo,
 * las cookies y la query, se dejan solo encabezados inocuos y el resto pasa por los mismos
 * filtros del logger (claves sensibles, correos y teléfonos enmascarados).
 */
export function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
  if (event.request) {
    const { headers } = event.request;
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
    if (headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(headers).filter(([key]) => SAFE_HEADERS.has(key.toLowerCase())),
      );
    }
  }

  if (event.user) {
    // Solo el id interno; nada de correo, nombre ni IP.
    event.user = event.user.id ? { id: event.user.id } : undefined;
  }

  if (event.message) event.message = sanitizeString(event.message);
  if (event.extra) event.extra = sanitizeValue(event.extra) as ErrorEvent["extra"];
  if (event.contexts) event.contexts = sanitizeValue(event.contexts) as ErrorEvent["contexts"];

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = sanitizeString(exception.value);
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = sanitizeString(breadcrumb.message);
    if (breadcrumb.data) breadcrumb.data = sanitizeValue(breadcrumb.data) as typeof breadcrumb.data;
  }

  return event;
}
