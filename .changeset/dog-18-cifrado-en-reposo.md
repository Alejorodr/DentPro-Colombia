---
"dentpro-colombia": minor
---

Cifrado en reposo de los datos sensibles (DOG-18) con AES-256-GCM: teléfono, documento, dirección y aseguradora del paciente; notas de citas y notas clínicas; motivo, notas, diagnóstico y plan de los episodios; alergias y prescripciones. El documento se busca por hash exacto y las notas clínicas se filtran tras descifrar. Incluye un script idempotente para cifrar los datos existentes y rotar la clave.
