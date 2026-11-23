import { initBotId } from "botid/client/core";

import { BOT_PROTECTED_ROUTES } from "@/lib/security/bot-protected-routes";

// Vercel BotID (DOG-17): adjunta la prueba invisible del navegador a los formularios públicos.
// En desarrollo no carga nada; la verificación del servidor está en lib/security/bot-protection.ts.
initBotId({ protect: BOT_PROTECTED_ROUTES.map((route) => ({ ...route })) });
