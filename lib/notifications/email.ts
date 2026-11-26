import { Role } from "@prisma/client";

import {
  buildAppointmentCancellationEmail,
  buildAppointmentConfirmationEmail,
  buildAppointmentReminderEmail,
  buildAppointmentRescheduleEmail,
} from "@/lib/email/templates";
import { enqueueEmail } from "@/lib/email/outbox";
import { isEmailEnabledForUser } from "@/lib/notification-preferences";
import { logger } from "@/lib/logger";
import { CLINIC_TIME_ZONE } from "@/lib/dates/tz";

export type AppointmentEmailType = "confirmation" | "reminder" | "reschedule" | "cancellation";

type AppointmentSnapshot = {
  id: string;
  patient: { user: AppointmentEmailUser } | null;
  professional: { user: AppointmentEmailUser } | null;
  timeSlot: {
    startAt: Date;
    endAt: Date;
  };
};

type AppointmentEmailUser = {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: Role;
};

type Recipient = {
  userId: string;
  email: string | null;
  name: string;
  role: Role;
};

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("es-CO", { timeZone: CLINIC_TIME_ZONE, weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTimeLabel(startAt: Date, endAt: Date) {
  return `${startAt.toLocaleTimeString("es-CO", { timeZone: CLINIC_TIME_ZONE, hour: "2-digit", minute: "2-digit" })} - ${endAt.toLocaleTimeString("es-CO", { timeZone: CLINIC_TIME_ZONE, hour: "2-digit", minute: "2-digit" })}`;
}

function buildEmailData(appointment: AppointmentSnapshot) {
  const patientName = appointment.patient
    ? `${appointment.patient.user.name} ${appointment.patient.user.lastName}`
    : "Paciente";
  const professionalName = appointment.professional
    ? `${appointment.professional.user.name} ${appointment.professional.user.lastName}`
    : "Profesional";
  const dateLabel = formatDateLabel(appointment.timeSlot.startAt);
  const timeLabel = formatTimeLabel(appointment.timeSlot.startAt, appointment.timeSlot.endAt);

  return {
    patientName,
    professionalName,
    dateLabel,
    timeLabel,
  };
}

function buildTemplate(type: AppointmentEmailType, appointment: AppointmentSnapshot) {
  const data = buildEmailData(appointment);
  if (type === "confirmation") {
    return buildAppointmentConfirmationEmail(data);
  }
  if (type === "reminder") {
    return buildAppointmentReminderEmail(data);
  }
  if (type === "reschedule") {
    return buildAppointmentRescheduleEmail(data);
  }
  return buildAppointmentCancellationEmail(data);
}

function getRecipients(appointment: AppointmentSnapshot): Recipient[] {
  const recipients: Recipient[] = [];

  if (appointment.patient?.user) {
    recipients.push({
      userId: appointment.patient.user.id,
      email: appointment.patient.user.email,
      name: `${appointment.patient.user.name} ${appointment.patient.user.lastName}`,
      role: appointment.patient.user.role as Role,
    });
  }

  if (appointment.professional?.user) {
    recipients.push({
      userId: appointment.professional.user.id,
      email: appointment.professional.user.email,
      name: `${appointment.professional.user.name} ${appointment.professional.user.lastName}`,
      role: appointment.professional.user.role as Role,
    });
  }

  return recipients;
}

/**
 * Encola el correo de la cita para cada destinatario con correo y notificaciones activas (DOG-13).
 * El envío ocurre después de responder; devuelve true si quedó al menos uno en cola.
 */
export async function sendAppointmentEmail(
  type: AppointmentEmailType,
  appointment: AppointmentSnapshot,
): Promise<boolean> {
  const template = buildTemplate(type, appointment);
  const recipients = getRecipients(appointment);
  let queuedCount = 0;

  await Promise.all(
    recipients.map(async (recipient) => {
      if (!recipient.email) {
        return;
      }

      const enabled = await isEmailEnabledForUser(recipient.userId, recipient.role);
      if (!enabled) {
        return;
      }

      const result = await enqueueEmail({
        kind: `appointment.${type}`,
        transport: "smtp",
        to: recipient.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        // Pasada la hora de la cita, un recordatorio o confirmación ya no sirve.
        expiresAt: appointment.timeSlot.startAt,
      });

      if (result.queued) {
        queuedCount += 1;
      } else {
        logger.warn({
          event: "appointment.email.not_queued",
          appointmentId: appointment.id,
          type,
          reason: result.reason,
        });
      }
    }),
  );

  return queuedCount > 0;
}
