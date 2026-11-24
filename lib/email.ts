import nodemailer from "nodemailer";

import { fetchWithTimeout } from "@/lib/http";
import { logger } from "@/lib/logger";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

/** Canal de envío: SMTP para las notificaciones de citas, Resend para el restablecimiento de contraseña. */
export type EmailTransport = "smtp" | "resend";

/** Error que no se arregla reintentando (buzón inexistente, remitente rechazado, petición inválida). */
export class PermanentEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentEmailError";
  }
}

// Sin estos límites nodemailer espera hasta 2 min para conectar y 10 min por respuesta del socket.
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 20_000;
const RESEND_TIMEOUT_MS = 10_000;

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

let hasWarnedMissingConfig = false;

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!host || !user || !pass || !from || !Number.isFinite(port)) {
    return null;
  }

  return { host, port, user, pass, from };
}

function getResendConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

export function isEmailTransportConfigured(transport: EmailTransport): boolean {
  const configured = transport === "smtp" ? getSmtpConfig() !== null : getResendConfig() !== null;
  if (!configured && transport === "smtp" && !hasWarnedMissingConfig) {
    hasWarnedMissingConfig = true;
    logger.warn({ event: "email.config.missing" }, "SMTP no configurado; emails deshabilitados.");
  }
  return configured;
}

async function deliverSmtp(payload: EmailPayload): Promise<void> {
  const config = getSmtpConfig();
  if (!config) throw new Error("SMTP no configurado.");

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
    });
  } catch (error) {
    // Respuestas SMTP 5xx (p. ej. 550 buzón inexistente) son definitivas; 4xx y errores de red no.
    const responseCode = (error as { responseCode?: unknown }).responseCode;
    if (typeof responseCode === "number" && responseCode >= 500 && responseCode < 600) {
      throw new PermanentEmailError(`SMTP ${responseCode}: ${error instanceof Error ? error.message : "rechazado"}`);
    }
    throw error;
  } finally {
    transporter.close();
  }
}

async function deliverResend(payload: EmailPayload): Promise<void> {
  const config = getResendConfig();
  if (!config) throw new Error("Resend no configurado.");

  const response = await fetchWithTimeout(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    },
    { timeoutMs: RESEND_TIMEOUT_MS },
  );

  if (!response.ok) {
    const message = `Resend ${response.status}: ${(await response.text().catch(() => "")).slice(0, 300)}`;
    // 4xx salvo 408/429 = petición inválida o remitente no verificado: reintentar no sirve.
    if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
      throw new PermanentEmailError(message);
    }
    throw new Error(message);
  }
}

/** Envía un correo por el canal indicado. Lanza si falla; quien llama decide si reintenta. */
export async function deliverEmail(transport: EmailTransport, payload: EmailPayload): Promise<void> {
  if (transport === "smtp") return deliverSmtp(payload);
  return deliverResend(payload);
}
