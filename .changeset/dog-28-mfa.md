---
"dentpro-colombia": minor
---

Verificación en dos pasos (DOG-28) obligatoria para administradores y profesionales: app autenticadora (TOTP), 10 códigos de respaldo de un solo uso y restablecimiento por otro administrador desde Usuarios. Con la contraseña sola no se accede al portal ni a la API hasta completar el segundo paso; inscripciones, verificaciones, fallos, uso de códigos de respaldo y restablecimientos quedan en auditoría. El secreto TOTP se guarda cifrado. Nueva migración `dog28_mfa`.
