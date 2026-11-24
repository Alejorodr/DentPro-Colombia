import { beforeEach, describe, expect, it, vi } from "vitest";

const { deliverMock, configuredMock, alertMock, afterCallbacks, rows, prismaMock } = vi.hoisted(() => {
  const rows = new Map<string, Record<string, any>>();
  const matches = (row: Record<string, any>, where: Record<string, any>): boolean => {
    if (where.id && row.id !== where.id) return false;
    if (where.OR) return (where.OR as Array<Record<string, any>>).some((clause) => matches(row, clause));
    if (where.status && row.status !== where.status) return false;
    if (where.nextAttemptAt?.lte && !(row.nextAttemptAt <= where.nextAttemptAt.lte)) return false;
    if (where.lockedUntil?.lt && !(row.lockedUntil && row.lockedUntil < where.lockedUntil.lt)) return false;
    return true;
  };
  const prismaMock = {
    emailOutbox: {
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        const id = `row-${rows.size + 1}`;
        rows.set(id, { id, status: "PENDING", attempts: 0, nextAttemptAt: new Date(0), lockedUntil: null, ...data });
        return { id };
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, any>; data: Record<string, any> }) => {
        let count = 0;
        for (const row of rows.values()) {
          if (matches(row, where)) {
            Object.assign(row, data);
            count += 1;
          }
        }
        return { count };
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (rows.has(where.id) ? { ...rows.get(where.id) } : null)),
      findMany: vi.fn(async ({ where }: { where: Record<string, any> }) =>
        [...rows.values()].filter((row) => matches(row, where)).map((row) => ({ id: row.id })),
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, any> }) =>
        Object.assign(rows.get(where.id)!, data),
      ),
    },
  };
  return {
    deliverMock: vi.fn(),
    configuredMock: vi.fn(() => true),
    alertMock: vi.fn(),
    afterCallbacks: [] as Array<() => unknown>,
    rows,
    prismaMock,
  };
});

vi.mock("next/server", () => ({ after: (callback: () => unknown) => void afterCallbacks.push(callback) }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/observability", () => ({ reportOperationalAlert: alertMock }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return { ...actual, deliverEmail: deliverMock, isEmailTransportConfigured: configuredMock };
});

import { PermanentEmailError } from "@/lib/email";
import { deliverOutboxEmail, enqueueEmail, processDueOutboxEmails } from "@/lib/email/outbox";

const NOW = new Date("2030-01-01T12:00:00Z");
const now = () => NOW;
const fast = { retryDelaysMs: [0, 0], now };
const input = { kind: "appointment.confirmation", transport: "smtp" as const, to: "a@b.co", subject: "Cita", html: "<p>Hola</p>" };

beforeEach(() => {
  vi.clearAllMocks();
  rows.clear();
  afterCallbacks.length = 0;
  configuredMock.mockReturnValue(true);
});

describe("email outbox", () => {
  it("encola sin enviar y envía después de responder", async () => {
    const result = await enqueueEmail(input);
    expect(result).toEqual({ queued: true, id: "row-1" });
    expect(deliverMock).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);

    await afterCallbacks[0]();
    expect(deliverMock).toHaveBeenCalledWith("smtp", { to: "a@b.co", subject: "Cita", html: "<p>Hola</p>", text: undefined });
    expect(rows.get("row-1")).toMatchObject({ status: "SENT", attempts: 1, html: null, text: null });
  });

  it("no encola si el canal no está configurado", async () => {
    configuredMock.mockReturnValue(false);
    expect(await enqueueEmail(input)).toEqual({ queued: false, reason: "transport_not_configured" });
    expect(prismaMock.emailOutbox.create).not.toHaveBeenCalled();
  });

  it("reintenta 3 veces y deja la fila pendiente para el cron", async () => {
    deliverMock.mockRejectedValue(new Error("ETIMEDOUT"));
    await enqueueEmail(input, { deliver: "none" });

    expect(await deliverOutboxEmail("row-1", fast)).toBe("PENDING");
    expect(deliverMock).toHaveBeenCalledTimes(3);
    expect(rows.get("row-1")).toMatchObject({ status: "PENDING", attempts: 3, lastError: "ETIMEDOUT", lockedUntil: null });
    expect(rows.get("row-1")!.nextAttemptAt.getTime()).toBe(NOW.getTime() + 60 * 60 * 1000);
    expect(rows.get("row-1")!.html).toBe("<p>Hola</p>");
    expect(alertMock).not.toHaveBeenCalled();
  });

  it("un error definitivo marca FAILED sin más intentos y alerta", async () => {
    deliverMock.mockRejectedValue(new PermanentEmailError("SMTP 550: buzón inexistente"));
    await enqueueEmail(input, { deliver: "none" });

    expect(await deliverOutboxEmail("row-1", fast)).toBe("FAILED");
    expect(deliverMock).toHaveBeenCalledTimes(1);
    expect(alertMock).toHaveBeenCalledWith(expect.objectContaining({ event: "email.outbox.failed" }));
  });

  it("tras el máximo de intentos pasa a FAILED", async () => {
    deliverMock.mockRejectedValue(new Error("ECONNRESET"));
    await enqueueEmail(input, { deliver: "none" });
    rows.get("row-1")!.attempts = 8;

    expect(await deliverOutboxEmail("row-1", fast)).toBe("FAILED");
    expect(deliverMock).toHaveBeenCalledTimes(1);
    expect(rows.get("row-1")).toMatchObject({ status: "FAILED", attempts: 9 });
  });

  it("no envía un correo vencido", async () => {
    await enqueueEmail({ ...input, expiresAt: new Date(NOW.getTime() - 1000) }, { deliver: "none" });

    expect(await deliverOutboxEmail("row-1", fast)).toBe("FAILED");
    expect(deliverMock).not.toHaveBeenCalled();
    expect(rows.get("row-1")).toMatchObject({ status: "FAILED", html: null });
  });

  it("no envía dos veces una fila ya reclamada", async () => {
    await enqueueEmail(input, { deliver: "none" });
    rows.get("row-1")!.status = "SENDING";
    rows.get("row-1")!.lockedUntil = new Date(NOW.getTime() + 60_000);

    expect(await deliverOutboxEmail("row-1", fast)).toBeNull();
    expect(deliverMock).not.toHaveBeenCalled();
  });

  it("el cron procesa solo lo que ya tocaba", async () => {
    deliverMock.mockResolvedValue(undefined);
    await enqueueEmail(input, { deliver: "none" });
    await enqueueEmail(input, { deliver: "none" });
    rows.get("row-2")!.nextAttemptAt = new Date(NOW.getTime() + 60_000);

    expect(await processDueOutboxEmails(fast)).toEqual({ processed: 1, sent: 1, pending: 0, failed: 0 });
    expect(rows.get("row-1")!.status).toBe("SENT");
    expect(rows.get("row-2")!.status).toBe("PENDING");
  });
});
