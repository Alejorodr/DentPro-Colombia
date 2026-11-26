# Historial de auditorías de seguridad

Este archivo resume los reportes de seguridad de agosto de 2026 (auditoría STANDARD, re-test, remediación, preparación de staging y matriz de pruebas). Los originales se borraron en DOG-31. El texto completo sigue en el historial de git: `git log --all -- 'security-*.md'`.

Los hallazgos de la auditoría de noviembre están en [`plan-refuerzo-2026-11-20.md`](plan-refuerzo-2026-11-20.md).

## Auditoría STANDARD (29 de agosto de 2026)

El análisis fue estático y local. No se corrieron pruebas activas (DAST, ZAP, Nuclei, fuzzing ni fuerza bruta). La calificación inicial fue de 58/100.

| ID | Severidad | Hallazgo | Estado |
|---|---|---|---|
| SEC-001 | Alta | La sesión JWT conservaba el rol o el estado viejo después de cambiar la cuenta | Corregido: la sesión se resuelve contra la base en cada petición |
| SEC-002 | Alta | Adjuntos clínicos guardados y servidos con URLs públicas de Blob | Corregido para los adjuntos nuevos (Blob privado y descarga autorizada). Los adjuntos viejos que sigan en `clinical/` se migran en DOG-32 |
| SEC-003 | Media | HTML sanitizado de forma incompleta antes de `dangerouslySetInnerHTML` | Corregido con `sanitize-html` y una lista de etiquetas permitidas |
| SEC-004 | Media | El rate limit dejaba pasar todo si Upstash fallaba o faltaba | Corregido: hay un respaldo en memoria y en producción falla cerrado (503) |
| SEC-005 | Media | GitHub Actions con tags mutables y permisos implícitos | Corregido: acciones fijadas por SHA y permisos mínimos |
| SEC-006 | Media | Los horarios se podían enumerar sin iniciar sesión | Corregido: ahora piden sesión. Queda pendiente reducir lo que se muestra a usuarios autenticados |
| SEC-007 | Media | Abuso del registro y enumeración de cuentas duplicadas | Corregido: rate limit propio y la misma respuesta para cuentas duplicadas |
| SEC-008 | Baja | `/_monitoring?error=1` era público y generaba ruido en Sentry | Corregido: pide `MONITORING_TEST_TOKEN` y responde 404 sin él |
| SEC-009 | Baja | Los adjuntos profesionales viejos aceptaban URLs externas o `data:` arbitrarias | Mitigado: solo se aceptan HTTPS y `data:` de PDF o imágenes, y los valores inseguros se filtran al leerlos |

Cada corrección tiene tests de regresión en `tests/` (sesión, adjuntos, sanitización, rate limit, horarios, registro, monitoreo y dominio clínico).

## Staging de seguridad (planeado en agosto, nunca se montó)

Se diseñó un entorno aislado con datos sintéticos para una auditoría profunda: base, Blob y Upstash propios, más identidades de prueba por rol. No se aprovisionó. Si algún día se monta, la matriz de usuarios de prueba y el plan siguen en el historial de git.

## Riesgos que siguen abiertos

- No está verificado si quedan adjuntos clínicos públicos en producción. Se revisa en DOG-32.
- Los adjuntos clínicos no validan su contenido real, solo el tipo que declara el navegador. Se corrige en DOG-33.
- Los horarios que ven los usuarios autenticados muestran más de lo necesario (residual de SEC-006).
