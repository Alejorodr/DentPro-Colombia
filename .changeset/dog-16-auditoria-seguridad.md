---
"dentpro-colombia": patch
---

Auditoría de seguridad (DOG-16): Sentry ahora se inicializa en el servidor cuando hay `SENTRY_DSN` y limpia cada evento antes de enviarlo (sin cuerpo, cookies, query ni datos clínicos). Los logs también ocultan alergias, diagnósticos, prescripciones, documentos y datos de aseguradora. La disponibilidad pública tiene rate limit y un rango máximo de 31 días.
