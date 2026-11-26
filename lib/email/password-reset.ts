import { isEmailTransportConfigured } from "@/lib/email";
import { enqueueEmail } from "@/lib/email/outbox";

type PasswordResetEmailPayload = {
  to: string;
  resetLink: string;
  /** Vencimiento del token: después no tiene sentido reintentar el envío. */
  expiresAt?: Date;
};

function buildPasswordResetEmail(resetLink: string) {
  return {
    subject: "Restablecer contraseña en DentPro",
    text: `Recibimos una solicitud para restablecer tu contraseña. Abre este enlace para continuar: ${resetLink}`,
    html: `
        <p>Recibimos una solicitud para restablecer tu contraseña en DentPro.</p>
        <p>Haz clic en el siguiente enlace para continuar:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      `,
  };
}

/**
 * Encola el correo de restablecimiento (DOG-13) y lo envía en el acto: quien llama ya corre
 * después de responder. Si falla, la cola lo reintenta.
 */
export async function sendPasswordResetEmail({ to, resetLink, expiresAt }: PasswordResetEmailPayload): Promise<void> {
  if (!isEmailTransportConfigured("resend")) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[DEV] Password reset link for ${to}: ${resetLink}`);
    } else {
      console.warn("Password reset email could not be sent: missing RESEND_API_KEY or EMAIL_FROM.");
    }
    return;
  }

  await enqueueEmail({ kind: "password_reset", transport: "resend", to, expiresAt, ...buildPasswordResetEmail(resetLink) }, { deliver: "inline" });
}
