import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { sendAppointmentEmail } from "@/lib/notifications/email";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/app/api/_utils/request";

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return true;
  }

  const header = request.headers.get("authorization")?.trim();
  if (header?.startsWith("Bearer ")) {
    return header.replace("Bearer ", "") === secret;
  }

  const cronKey = request.headers.get("x-cron-key")?.trim();
  return cronKey === secret;
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
      status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
      timeSlot: {
        startAt: { gte: windowStart, lt: windowEnd },
      },
    },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true } },
      timeSlot: true,
    },
  });

  let sentCount = 0;

  for (const appointment of appointments) {
    const sent = await sendAppointmentEmail("reminder", appointment);
    if (sent) {
      sentCount += 1;
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      });
    }
  }

  logger.info({
    event: "cron.reminders.completed",
    route: "/api/cron/appointments/reminders",
    requestId,
    appointmentCount: appointments.length,
    sentCount,
  });

  return NextResponse.json({ processed: appointments.length, sent: sentCount });
}
