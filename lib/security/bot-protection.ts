import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";

import { logger } from "@/lib/logger";

/**
 * Verifica con Vercel BotID si la petición actual viene de un bot (DOG-17).
 *
 * - Fuera de Vercel (desarrollo, CI, E2E locales) no hay servicio de BotID: devuelve `false`.
 * - Si BotID falla, deja pasar la petición y lo registra. El rate limit de cada ruta sigue
 *   siendo la segunda capa, y así una caída de BotID no deja a los pacientes sin poder entrar.
 */
export async function isBotRequest(route: string): Promise<boolean> {
  if (process.env.VERCEL !== "1") return false;

  try {
    const verification = await checkBotId();
    if (verification.isBot) {
      logger.warn({ event: "security.bot_blocked", route });
      return true;
    }
    return false;
  } catch (error) {
    logger.error({ event: "security.botid_check_failed", route, error }, "BotID check failed; allowing request");
    return false;
  }
}

export function botBlockedResponse() {
  return NextResponse.json(
    { error: "No pudimos verificar tu solicitud. Recarga la página e intenta de nuevo." },
    { status: 403 },
  );
}
