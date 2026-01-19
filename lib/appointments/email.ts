import type { Appointment, PatientProfile, ProfessionalProfile, TimeSlot, User } from "@prisma/client";
import { Role } from "@prisma/client";

import { sendEmail } from "@/lib/email";
import {
  buildAppointmentCancellationEmail,
  buildAppointmentConfirmationEmail,
  buildAppointmentReminderEmail,
  buildAppointmentRescheduleEmail,
} from "@/lib/email/templates";
import { isEmailEnabledForUser } from "@/lib/notification-preferences";
import { logger } from "@/lib/logger";

type AppointmentSnapshot = Appointment & {
  patient: (PatientProfile & { user: User }) | null;
  professional: (ProfessionalProfile & { user: User }) | null;
  timeSlot: TimeSlot;
};

type EmailType = "confirmation" | "reminder" | "reschedule" | "cancellation";

type Recipient = {
  userId: string;
  email: string | null;
  name: string;
  role: Role;
};

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTimeLabel(startAt: Date, endAt: Date) {
  return `${startAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} - ${endAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
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

function buildTemplate(type: EmailType, appointment: AppointmentSnapshot) {
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

export async function sendAppointmentEmail(type: EmailType, appointment: AppointmentSnapshot): Promise<boolean> {
  const template = buildTemplate(type, appointment);
  const recipients = getRecipients(appointment);
  let sentCount = 0;

  await Promise.all(
    recipients.map(async (recipient) => {
      if (!recipient.email) {
        return;
      }

      const enabled = await isEmailEnabledForUser(recipient.userId, recipient.role);
      if (!enabled) {
        return;
      }

      const result = await sendEmail({
        to: recipient.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (result.sent) {
        sentCount += 1;
      }

      if (!result.sent && !result.skipped) {
        logger.warn({
          event: "appointment.email.failed",
          appointmentId: appointment.id,
          recipient: recipient.email,
          type,
        });
      }
    }),
  );

  return sentCount > 0;
}
