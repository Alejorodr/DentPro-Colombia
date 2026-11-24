import { after } from "next/server";

import { deliverEmail, isEmailTransportConfigured, PermanentEmailError, type EmailTransport } from "@/lib/email";
import { logger } from "@/lib/logger";
import { reportOperationalAlert } from "@/lib/observability";
import { getPrismaClient } from "@/lib/prisma";

/**
 * Cola de correos salientes (DOG-13), guardada en Postgres.
 *
 * 1. `enqueueEmail` guarda el correo (cuerpo cifrado por DOG-18) y programa el envío con
 *    `after()`, así la petición del usuario responde sin esperar al proveedor de correo.
 * 2. `deliverOutboxEmail` reclama la fila, intenta hasta 3 veces con espera corta y, si sigue
 *    fallando, la deja PENDING para más tarde.
 * 3. El cron diario llama a `processDueOutboxEmails` para reintentar lo que quedó pendiente.
 * Tras MAX_ATTEMPTS intentos, o ante un error definitivo, la fila pasa a FAILED con alerta.
 */

export type EnqueueEmailInput = {
  kind: string;
  transport: EmailTransport;
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Pasada esta fecha no se envía (p. ej. el enlace de restablecimiento venció). */
  expiresAt?: Date | null;
};

export type EnqueueEmailResult = { queued: true; id: string } | { queued: false; reason: "transport_not_configured" };

const MAX_ATTEMPTS = 9;
const RETRY_DELAYS_MS = [2_000, 5_000];
const LOCK_MS = 2 * 60 * 1000;
const NEXT_ROUND_DELAY_MS = 60 * 60 * 1000;

type DeliveryOptions = {
  /** Esperas entre intentos dentro de una misma ronda (configurable para tests). */
  retryDelaysMs?: number[];
  now?: () => Date;
};

function sleep(ms: number) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function describeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

/** Corre `task` después de responder; fuera de una petición (scripts) la lanza en segundo plano. */
function runAfterResponse(task: () => Promise<unknown>) {
  try {
    after(task);
  } catch {
    void task().catch((error) => logger.error({ event: "email.outbox.background_failed", error }));
  }
}

export async function enqueueEmail(
  input: EnqueueEmailInput,
  { deliver = "after" }: { deliver?: "after" | "inline" | "none" } = {},
): Promise<EnqueueEmailResult> {
  if (!isEmailTransportConfigured(input.transport)) {
    return { queued: false, reason: "transport_not_configured" };
  }

  const row = await getPrismaClient().emailOutbox.create({
    data: {
      kind: input.kind,
      transport: input.transport,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? null,
      expiresAt: input.expiresAt ?? null,
    },
    select: { id: true },
  });

  if (deliver === "inline") await deliverOutboxEmail(row.id);
  else if (deliver === "after") runAfterResponse(() => deliverOutboxEmail(row.id));

  return { queued: true, id: row.id };
}

/**
 * Envía una fila de la cola. Devuelve el estado final de esta ronda, o null si otra ejecución
 * ya la tenía reclamada (o ya estaba enviada).
 */
export async function deliverOutboxEmail(id: string, options: DeliveryOptions = {}) {
  const prisma = getPrismaClient();
  const now = options.now ?? (() => new Date());
  const delays = options.retryDelaysMs ?? RETRY_DELAYS_MS;
  const claimedAt = now();

  // Reclamo atómico: evita que after() y el cron envíen el mismo correo a la vez.
  const claim = await prisma.emailOutbox.updateMany({
    where: {
      id,
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: claimedAt } },
        { status: "SENDING", lockedUntil: { lt: claimedAt } },
      ],
    },
    data: { status: "SENDING", lockedUntil: new Date(claimedAt.getTime() + LOCK_MS) },
  });
  if (claim.count === 0) return null;

  const row = await prisma.emailOutbox.findUnique({ where: { id } });
  if (!row || !row.html) return null;

  if (row.expiresAt && row.expiresAt.getTime() <= now().getTime()) {
    await prisma.emailOutbox.update({
      where: { id },
      data: { status: "FAILED", lastError: "Vencido antes de poder enviarse.", lockedUntil: null, html: null, text: null },
    });
    logger.warn({ event: "email.outbox.expired", outboxId: id, kind: row.kind, attempts: row.attempts });
    return "FAILED" as const;
  }

  let attempts = row.attempts;
  let lastError: unknown = null;

  for (let round = 0; round <= delays.length && attempts < MAX_ATTEMPTS; round += 1) {
    if (round > 0) await sleep(delays[round - 1] ?? 0);
    attempts += 1;
    try {
      await deliverEmail(row.transport as EmailTransport, {
        to: row.to,
        subject: row.subject,
        html: row.html,
        text: row.text ?? undefined,
      });
      // El cuerpo ya no hace falta: se borra para no guardar enlaces ni datos de más.
      await prisma.emailOutbox.update({
        where: { id },
        data: { status: "SENT", attempts, sentAt: now(), lockedUntil: null, lastError: null, html: null, text: null },
      });
      logger.info({ event: "email.outbox.sent", outboxId: id, kind: row.kind, attempts });
      return "SENT" as const;
    } catch (error) {
      lastError = error;
      if (error instanceof PermanentEmailError) break;
    }
  }

  const failed = lastError instanceof PermanentEmailError || attempts >= MAX_ATTEMPTS;
  await prisma.emailOutbox.update({
    where: { id },
    data: {
      status: failed ? "FAILED" : "PENDING",
      attempts,
      lastError: describeError(lastError),
      lockedUntil: null,
      nextAttemptAt: new Date(now().getTime() + NEXT_ROUND_DELAY_MS),
    },
  });

  logger.warn({ event: failed ? "email.outbox.failed" : "email.outbox.retry_later", outboxId: id, kind: row.kind, attempts, error: lastError });
  if (failed) {
    reportOperationalAlert({ event: "email.outbox.failed", context: { kind: row.kind, attempts, reason: describeError(lastError) } });
  }
  return failed ? ("FAILED" as const) : ("PENDING" as const);
}

/** Reintenta los correos pendientes cuyo turno ya llegó (lo llama el cron). */
export async function processDueOutboxEmails({ limit = 50, ...options }: DeliveryOptions & { limit?: number } = {}) {
  const now = (options.now ?? (() => new Date()))();
  const due = await getPrismaClient().emailOutbox.findMany({
    where: {
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "SENDING", lockedUntil: { lt: now } },
      ],
    },
    select: { id: true },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
  });

  const summary = { processed: due.length, sent: 0, pending: 0, failed: 0 };
  for (const { id } of due) {
    const status = await deliverOutboxEmail(id, options);
    if (status === "SENT") summary.sent += 1;
    else if (status === "PENDING") summary.pending += 1;
    else if (status === "FAILED") summary.failed += 1;
  }
  return summary;
}
