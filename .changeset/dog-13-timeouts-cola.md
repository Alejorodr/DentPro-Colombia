---
"dentpro-colombia": minor
---

Timeouts y cola de correos (DOG-13): los correos de citas y de restablecimiento de contraseña se guardan en una cola en Postgres (cuerpo cifrado) y se envían después de responder, con 3 reintentos inmediatos y reintento diario desde el cron; los errores definitivos y los correos vencidos no se reintentan. Timeouts explícitos en SMTP, Resend, Google Places y Vercel Blob.
