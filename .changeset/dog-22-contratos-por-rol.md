---
"dentpro-colombia": patch
---

Tests de contrato por rol (DOG-22): una matriz que llama a 23 handlers de APIs críticas (admin, recepción, paciente, profesional y clínica) con cada rol y sin sesión. Confirma que sin sesión responden 401, que un rol no permitido recibe 403 sin tocar la base y que los roles permitidos pasan la autorización.
