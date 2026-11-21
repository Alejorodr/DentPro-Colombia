# Plan de refuerzo de seguridad — 20 nov 2026

Origen: auditoría estática `/cso`, corrida `1795210631060-2fa3cbd45de5f701`.
Estado: **parcial**. Cubrió `app`, `lib`, `prisma`, `components`, `scripts`, `.github`, la configuración de auth/proxy/next y `pnpm-lock.yaml`. Hubo que limitar las rutas porque el repo pesa ~410 MiB y el límite es 64 MiB, y no hubo escáneres porque Windows no tiene Docker Linux. De las 116 rutas API se revisaron a fondo las de mayor riesgo.

## Hallazgos confirmados

| ID | Severidad | Dónde | Problema |
|---|---|---|---|
| S1 | Media | `app/api/patients/[id]/route.ts:96-109` | **RECEPCIONISTA** puede hacer `DELETE` de un paciente con borrado duro (`prisma.user.delete`) y **sin auditoría**. Si el paciente tiene citas o episodios, la base lo impide (`onDelete: Restrict`) y la ruta responde 500. Si no tiene, se borran en cascada sus consentimientos firmados y alergias. |
| S2 | Baja | `app/api/users/[id]/route.ts:263`, `app/api/professionals/[id]/route.ts:153` y `prisma/schema.prisma:386` | El borrado duro de usuarios y profesionales cascadea notas clínicas del autor (`ClinicalNote.author onDelete: Cascade`). En la práctica lo frena el `Restrict` de citas y episodios, que hace fallar el borrado con un 500. |

> Corrección del 21 nov: la versión inicial calificó S1 como alta por suponer que la cascada alcanzaba toda la historia clínica. Al revisar de nuevo el esquema, `Appointment.patient` y `ClinicalEpisode.patient/createdByUser` ya usan `Restrict`.

## Endurecimiento recomendado (sin explotación demostrada)

| ID | Prioridad | Dónde | Recomendación |
|---|---|---|---|
| H1 | Alta | `app/api/_utils/ratelimit.ts` | Si faltan las variables de Upstash en producción, el rate limit cae a memoria por instancia y en serverless casi no limita (login, reset, registro). Hay que confirmar `UPSTASH_REDIS_REST_URL/TOKEN` en Vercel y fallar cerrado en las rutas de auth si faltan. **Hecho (21 nov):** las rutas `auth:*`/`ops` y los POST de `/api/auth/*` en `proxy.ts` responden 503 en producción si falta Upstash; el cambio de contraseña queda limitado por usuario. |
| H2 | Media | `next.config.ts:15` | La CSP de producción permite `script-src 'unsafe-inline'`: migrar a nonces (`proxy.ts` + `headers()`). **Hecho (21 nov):** nonce por petición en `proxy.ts` con `strict-dynamic` (`lib/security/csp.ts`). |
| H3 | Media | `app/api/ops/_utils.ts` | `OPS_IP_ALLOWLIST` vacía permite cualquier IP, y la IP se toma de `x-forwarded-for` (falsificable fuera de Vercel). Exigir allowlist cuando `OPS_KEY` esté definida. **Hecho (21 nov):** en producción una allowlist vacía deniega (salvo E2E con `RUN_E2E=1` fuera de Vercel) y en Vercel la IP sale de `x-vercel-forwarded-for`/`x-real-ip`. |
| H4 | Media | `app/api/ops/migrate/route.ts` | Endpoint marcado "TEMPORAL" que ejecuta `npx prisma migrate deploy`. Hoy solo corre en development, pero conviene eliminarlo y migrar desde CI. **Hecho (21 nov):** endpoint eliminado; las migraciones se aplican con `prisma migrate deploy` en CI o localmente. |
| H5 | Baja | `app/api/_monitoring/route.ts`, `app/api/cron/appointments/reminders/route.ts` | Los tokens se comparan con `===`: usar `timingSafeEqual`, como ya hace `isValidOpsKey`. **Hecho (21 nov):** `lib/security/safe-compare.ts`. |
| H6 | Baja | `app/api/appointments/[id]/payment/route.ts` | El monto pagado no se valida contra la tarifa del servicio y se puede revertir un pago `PAID` sin restricción. Está auditado, pero conviene una regla de transición y un tope. **Hecho (21 nov):** monto validado contra la tarifa, método obligatorio, revertir solo admin, 409 ante concurrencia. |

## Controles verificados que están bien

- **Adjuntos clínicos:** el paciente solo ve los suyos y visibles, el profesional solo los de sus episodios, recepción queda bloqueada y cada acceso se registra (`AccessLog`).
- **`calendar.ics`:** acotado al paciente o profesional de la cita.
- **Registro público:** siempre crea `PACIENTE` y tiene rate limit.
- **Cambio de rol:** solo admin, sin auto-cambio, protege al último admin y queda auditado.
- **Reset de contraseña:** token hasheado, política de contraseña y rate limit.
- **Subida de imágenes de marketing:** valida carpeta, tipo MIME, tamaño y nombre.
- **Rutas ops y test:** bloqueadas por entorno, llave comparada en tiempo constante y rate limit; `test/seed` está deshabilitado en Vercel.
- **Cron:** exige `CRON_SECRET` fuera de dev y test.
- **Cabeceras:** `X-Frame-Options DENY`, `nosniff` y `Referrer-Policy`.

## Plan por fases

**Fase 1, esta semana: proteger la historia clínica (S1 y S2)** — Hecha el 21 nov; migración `20261121120000_protect_clinical_records` aplicada en Neon.
1. En `DELETE /api/patients/[id]`, dejar solo `ADMINISTRADOR`, cambiar el borrado por soft-delete (`deletedAt`, `active=false`) y llamar a `logAuditEvent`.
2. En `DELETE /api/users/[id]`, desactivar en lugar de borrar (el campo `active` ya existe).
3. Hacer una migración Prisma que pase a `onDelete: Restrict` las relaciones de datos clínicos (`ClinicalNote.author`, `ClinicalEpisode`, `Prescription`, `ClinicalAttachment` y `SignedConsent` hacia paciente y usuario), para que la base impida borrados accidentales.
4. Agregar pruebas: recepción recibe 403 en DELETE de paciente; después de "borrar" un paciente sus episodios siguen en la BD; el borrado genera un evento de auditoría.

**Fase 2, próximas 2 semanas: autenticación y bordes** — Hecha el 21 nov (sin desplegar).
5. Rate limit distribuido obligatorio en producción, con fallo cerrado en las rutas de auth (H1).
6. CSP con nonces (H2).
7. Allowlist obligatoria para ops (H3), eliminar `/api/ops/migrate` (H4) y comparación en tiempo constante (H5).
8. Validación de pagos (H6).

**Fase 3, completar la auditoría (lo que no se cubrió)**
9. Escaneo de secretos en el historial de git (gitleaks) y CVE de dependencias (`pnpm audit` o OSV), en CI o en una máquina con Docker Linux.
10. Revisar `.github/workflows` (permisos, uso de secretos y acciones fijadas por SHA).
11. Revisar las ~100 rutas API restantes con dos usuarios por rol (pruebas de IDOR), sobre todo `/api/search`, `/api/professional/*`, `/api/client/*`, `/api/notifications/*` y `/api/admin/patients/[id]/export`.
12. Limpiar el repo de artefactos grandes (reportes, capturas) para que futuras auditorías completas quepan en el límite.

## Fase 3, resultados (21 nov)

Revisión de solo lectura con 4 agentes: secretos, dependencias, CI/CD y control de acceso en las ~100 rutas API restantes.

### Ya corregido el 21 nov
- **Cuentas de prueba con contraseña pública en Neon.** `admin@dentpro.test` (ADMINISTRADOR) y `recepcion@dentpro.test` tenían las contraseñas que figuran en el repo. Desactivé las 4 cuentas `@dentpro.test`; queda 1 admin activo. No se pudo saber si alguien las usó, porque los logins no se registran en auditoría.
- **Recepción podía tomar control de un admin o profesional.** Si alguien había cambiado de rol, su perfil de paciente seguía existiendo inactivo, y recepción podía editarle el correo y luego pedir reset de contraseña. `PATCH`/`DELETE /api/patients/[id]` ahora rechazan cuentas que no tienen rol `PACIENTE`.
- **Límite por cuenta en el login.** 10 intentos cada 15 minutos por correo (guardado como hash), con fallo cerrado en producción.

### Pendiente (fase 4)
| Prioridad | Tema | Dónde | Acción |
|---|---|---|---|
| P0 | Next 16.3.0 con 5 RCE críticas y SSRF en Image Optimization | `package.json` | `pnpm up next@^16.4.5`, build y E2E |
| P0 | Las E2E locales siembran usuarios de prueba en la base real | `scripts/run-e2e.mjs:42-51` | Negarse a correr si `DATABASE_URL` no es local |
| P1 | Toma de cuenta por cambio de correo sin verificación más vinculación automática con Google | `app/api/patients/[id]`, `app/api/users/me`, `app/api/auth/register`, `auth.config.ts:122` (`allowDangerousEmailAccountLinking`) | Verificar el correo nuevo y vincular Google solo si el correo está verificado |
| P1 | Reservar y cancelar deja el turno bloqueado para siempre (DoS a la agenda) | `Appointment.timeSlotId @unique`, `lib/scheduling/slot-inventory.ts` | Liberar el turno al cancelar |
| P1 | Sin tope de citas por paciente y se aceptan turnos en el pasado | `app/api/appointments/route.ts` | Antelación mínima y máximo de citas activas por paciente |
| P1 | Dependencias: nodemailer 9 (ReDoS), zod (memoria), undici (TLS), Sentry | `package.json` | Subir versiones y añadir overrides |
| P1 | El build de Vercel marca migraciones fallidas como aplicadas | `scripts/vercel-prisma.mjs:140-176,233-246` | Fallar el build |
| P2 | `release.yml`: token con escritura en disco durante `pnpm install` | `.github/workflows/release.yml` | `persist-credentials: false`, `--ignore-scripts` y permisos por job |
| P2 | Un profesional puede mover su cita a la agenda de otro | `app/api/appointments/[id]/reschedule` | Mantener el mismo `professionalId` |
| P2 | Adjuntos con URL `http:`/`data:` sin validar | `app/api/professional/appointment/[id]/attachments` | Reusar `isSafeAttachmentUrl` |
| P2 | `GET /api/schedules` sin límite y abierto a pacientes | `app/api/schedules/route.ts` | Solo staff y con rango de fechas |
| P2 | El admin exporta episodios ocultos al paciente | `app/api/admin/patients/[id]/export` | Decisión de política |
| P2 | Timing en forgot-password y error 500 que revela correos en `PATCH /users/me` | ver rutas | Respuesta a tiempo constante y manejar P2002 |
| P3 | Rutas de agenda y analytics sin límite de rango; ICS sin escapar; bypass E2E sin guard de Vercel; sin CODEOWNERS ni Dependabot | varios | Endurecimiento |

Revisado y sin problemas: no hay secretos reales en el historial de git (escaneo por patrones, sin gitleaks); los workflows de CI no exponen secretos a forks y fijan las acciones por SHA; no hay IDOR clásico en las rutas de citas, clínicas ni profesionales.

## Fase 4, avance (21 nov)
Hecho, sin desplegar:
- **P0 Next:** 16.3.0 → 16.4.6. Cierra 5 RCE críticas y el SSRF de Image Optimization.
- **P0 E2E:** `scripts/e2e-db-guard.mjs` aborta si `DATABASE_URL` no es local.
- **P1 agenda:** índice único parcial (las citas canceladas liberan el turno), antelación mínima de 2 h, tope de 3 citas activas por paciente, un profesional no puede reprogramar a la agenda de otro y la ruta `/status` quedó corregida. Migración `20261121130000_release_cancelled_slots` **pendiente de aplicar**.
- **P1 dependencias:** `pnpm audit --prod` pasó de 1 crítica y 18 altas a 0 críticas y 0 altas (Sentry 10.78, zod 4.6.7, nodemailer 10.5, @vercel/blob 2.9, Prisma 7.10.1, overrides). Quedan 2 moderadas de build en glob/minimatch.
- **P1 build:** `scripts/vercel-prisma.mjs` falla si una migración falla; ya no la marca como aplicada.
- **P2/P3 CI:** permisos mínimos y `persist-credentials: false`, `--ignore-scripts` en release, timeouts, Dependabot y CODEOWNERS, pin de changesets corregido al commit y guard de Vercel para el bypass E2E.

Pendiente: decisiones sobre la vinculación con Google, el cambio de correo por recepción y el export clínico del admin; quitar de la UI las acciones que ahora rechaza el servidor; el resto de P2/P3.
