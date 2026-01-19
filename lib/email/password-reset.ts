import { fetchWithTimeout } from "@/lib/http";

type PasswordResetEmailPayload = {
  to: string;
  resetLink: string;
};

function getEmailFromAddress(): string | null {
  const from = process.env.EMAIL_FROM?.trim();
  return from && from.length > 0 ? from : null;
}

function getResendApiKey(): string | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  return apiKey && apiKey.length > 0 ? apiKey : null;
}

export async function sendPasswordResetEmail({ to, resetLink }: PasswordResetEmailPayload): Promise<void> {
  const resendApiKey = getResendApiKey();
  const emailFrom = getEmailFromAddress();

  if (!resendApiKey || !emailFrom) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[DEV] Password reset link for ${to}: ${resetLink}`);
    } else {
      console.warn("Password reset email could not be sent: missing RESEND_API_KEY or EMAIL_FROM.");
    }
    return;
  }

  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to,
      subject: "Restablecer contraseña en DentPro",
      text: `Recibimos una solicitud para restablecer tu contraseña. Abre este enlace para continuar: ${resetLink}`,
      html: `
        <p>Recibimos una solicitud para restablecer tu contraseña en DentPro.</p>
        <p>Haz clic en el siguiente enlace para continuar:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      `,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend error: ${response.status} ${message}`);
  }
}
