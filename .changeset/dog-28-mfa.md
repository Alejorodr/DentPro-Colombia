---
"dentpro-colombia": major
---

Verificación en dos pasos (DOG-28) obligatoria para administradores y profesionales: app autenticadora (TOTP), 10 códigos de respaldo de un solo uso y restablecimiento por otro administrador desde Usuarios. Con la contraseña sola no se accede al portal ni a la API hasta completar el segundo paso; inscripciones, verificaciones, fallos, uso de códigos de respaldo y restablecimientos quedan en auditoría. El secreto TOTP se guarda cifrado. Nueva migración `dog28_mfa`.

**Cambio mayor:** desde este release todo administrador y profesional debe activar la verificación en dos pasos en su siguiente ingreso; con la contraseña sola ya no entra al portal.
