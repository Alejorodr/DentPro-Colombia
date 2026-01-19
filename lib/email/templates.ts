import { getClinicInfo } from "@/lib/clinic";

export type AppointmentEmailData = {
  patientName: string;
  professionalName: string;
  dateLabel: string;
  timeLabel: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicCity?: string;
};

type TemplatePayload = {
  subject: string;
  title: string;
  message: string;
  data: AppointmentEmailData;
};

function buildEmailHtml({ title, message, data }: TemplatePayload): string {
  const clinic = getClinicInfo();
  const clinicName = data.clinicName ?? clinic.name;
  const clinicAddress = data.clinicAddress ?? clinic.address;
  const clinicCity = data.clinicCity ?? clinic.city;

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body { margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f8fbff; color: #0f172a; }
          .wrapper { padding: 32px 16px; }
          .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
          .badge { display: inline-block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #1f6cd3; background: #e6f4ff; padding: 6px 12px; border-radius: 999px; font-weight: 600; }
          .title { font-size: 22px; margin: 16px 0 8px; }
          .muted { color: #64748b; font-size: 14px; }
          .details { margin: 20px 0; padding: 16px; border-radius: 16px; background: #f1f5f9; }
          .details p { margin: 6px 0; font-size: 14px; }
          .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; }
          @media (prefers-color-scheme: dark) {
            body { background-color: #0f172a; color: #e2e8f0; }
            .card { background: #111b2d; box-shadow: none; }
            .badge { background: rgba(91, 208, 255, 0.15); color: #5bd0ff; }
            .muted { color: #94a3b8; }
            .details { background: #0b1f46; }
            .footer { color: #64748b; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <span class="badge">DentPro Colombia</span>
            <h1 class="title">${title}</h1>
            <p class="muted">${message}</p>
            <div class="details">
              <p><strong>Paciente:</strong> ${data.patientName}</p>
              <p><strong>Profesional:</strong> ${data.professionalName}</p>
              <p><strong>Fecha:</strong> ${data.dateLabel}</p>
              <p><strong>Hora:</strong> ${data.timeLabel}</p>
            </div>
            <p class="muted">Clínica: ${clinicName} · ${clinicAddress} · ${clinicCity}</p>
            <p class="footer">Si necesitas asistencia, responde a este correo para coordinar con el equipo.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildEmailText({ title, message, data }: TemplatePayload): string {
  return [
    title,
    message,
    `Paciente: ${data.patientName}`,
    `Profesional: ${data.professionalName}`,
    `Fecha: ${data.dateLabel}`,
    `Hora: ${data.timeLabel}`,
  ].join("\n");
}

export function buildAppointmentConfirmationEmail(data: AppointmentEmailData) {
  const payload = {
    subject: "Confirmación de turno en DentPro",
    title: "Tu turno quedó confirmado",
    message: "Gracias por agendar con nosotros. Te esperamos en la clínica.",
    data,
  };

  return {
    subject: payload.subject,
    html: buildEmailHtml(payload),
    text: buildEmailText(payload),
  };
}

export function buildAppointmentReminderEmail(data: AppointmentEmailData) {
  const payload = {
    subject: "Recordatorio: turno en DentPro mañana",
    title: "Recordatorio de turno",
    message: "Este es un recordatorio de tu turno programado para mañana.",
    data,
  };

  return {
    subject: payload.subject,
    html: buildEmailHtml(payload),
    text: buildEmailText(payload),
  };
}

export function buildAppointmentRescheduleEmail(data: AppointmentEmailData) {
  const payload = {
    subject: "Turno reprogramado en DentPro",
    title: "Tu turno fue reprogramado",
    message: "Actualizamos el horario de tu turno. Revisa los detalles a continuación.",
    data,
  };

  return {
    subject: payload.subject,
    html: buildEmailHtml(payload),
    text: buildEmailText(payload),
  };
}

export function buildAppointmentCancellationEmail(data: AppointmentEmailData) {
  const payload = {
    subject: "Turno cancelado en DentPro",
    title: "Turno cancelado",
    message: "Confirmamos que el turno fue cancelado. Si deseas reagendar, responde este correo.",
    data,
  };

  return {
    subject: payload.subject,
    html: buildEmailHtml(payload),
    text: buildEmailText(payload),
  };
}
