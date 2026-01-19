import nodemailer from "nodemailer";

import { logger } from "@/lib/logger";
import { reportOperationalAlert } from "@/lib/observability";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type EmailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

let hasWarnedMissingConfig = false;

function getEmailConfig(): EmailConfig | null {
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

function warnMissingConfig() {
  if (hasWarnedMissingConfig) {
    return;
  }
  hasWarnedMissingConfig = true;
  logger.warn({ event: "email.config.missing" }, "SMTP no configurado; emails deshabilitados.");
}

function createTransport(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; skipped: boolean }> {
  const config = getEmailConfig();
  if (!config) {
    warnMissingConfig();
    return { sent: false, skipped: true };
  }

  try {
    const transporter = createTransport(config);
    await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
    });
    return { sent: true, skipped: false };
  } catch (error) {
    logger.error(
      {
        event: "email.send.failed",
        error,
      },
      "Fallo al enviar email",
    );
    reportOperationalAlert({
      event: "email.send.failed",
      context: {
        reason: error instanceof Error ? error.message : "unknown",
      },
    });
    return { sent: false, skipped: false };
  }
}
