import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { sendAppointmentEmail } from "@/lib/notifications/email";
import { processDueOutboxEmails } from "@/lib/email/outbox";
import { logger } from "@/lib/logger";
import { REMINDABLE_APPOINTMENT_STATUSES } from "@/lib/appointments/status";
import { getRequestId } from "@/app/api/_utils/request";
import { safeEqual } from "@/lib/security/safe-compare";

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const isProtectedEnvironment = process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test";
  if (!secret) {
    return !isProtectedEnvironment;
  }

  const BEARER_PREFIX = "Bearer ";
  const header = request.headers.get("authorization")?.trim();
  if (header?.startsWith(BEARER_PREFIX)) {
    return safeEqual(header.slice(BEARER_PREFIX.length), secret);
  }

  const cronKey = request.headers.get("x-cron-key")?.trim();
  return safeEqual(cronKey, secret);
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  if (!isAuthorizedCron(request)) {
    logger.warn({
      event: "cron.reminders.unauthorized",
      route: "/api/cron/appointments/reminders",
      requestId,
      status: 401,
    });
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const prisma = getPrismaClient();
  const appointments = await prisma.appointment.findMany({
    where: {
      reminderSentAt: null,
      status: { in: REMINDABLE_APPOINTMENT_STATUSES },
      timeSlot: {
        startAt: { gte: windowStart, lt: windowEnd },
      },
    },
    include: {
      patient: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              lastName: true,
              role: true,
            },
          },
        },
      },
      professional: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              lastName: true,
              role: true,
            },
          },
        },
      },
      timeSlot: true,
    },
  });

  let sentCount = 0;
  let skippedAlreadySent = 0;
  let failedCount = 0;

  for (const appointment of appointments) {
    try {
      const sent = await sendAppointmentEmail("reminder", appointment);
      if (sent) {
        const updated = await prisma.appointment.updateMany({
          where: { id: appointment.id, reminderSentAt: null },
          data: { reminderSentAt: new Date() },
        });
        if (updated.count > 0) {
          sentCount += 1;
        } else {
          skippedAlreadySent += 1;
        }
      }
    } catch (error) {
      failedCount += 1;
      logger.warn({ event: "cron.reminders.send_failed", requestId, appointmentId: appointment.id, error });
    }
  }

  // DOG-13: el cron (diario) también reintenta los correos que quedaron pendientes en la cola.
  const outbox = await processDueOutboxEmails().catch((error: unknown) => {
    logger.error({ event: "cron.outbox.failed", requestId, error });
    return null;
  });

  logger.info({
    event: "cron.reminders.completed",
    route: "/api/cron/appointments/reminders",
    requestId,
    appointmentCount: appointments.length,
    sentCount,
    skippedAlreadySent,
    failedCount,
    outbox,
  });

  return NextResponse.json({
    processed: appointments.length,
    sent: sentCount,
    skippedAlreadySent,
    failed: failedCount,
    outbox,
  });
}
