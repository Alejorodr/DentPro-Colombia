"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  parseCookieConsent,
  readCookieConsentRaw,
  subscribeCookieConsent,
  type CookieConsent,
} from "@/lib/privacy/cookie-consent";

const SERVER_SNAPSHOT = "__server__";

export type CookieConsentState =
  /** Render del servidor o primera hidratación: aún no se sabe. No mostrar nada. */
  | { status: "pending" }
  /** No hay decisión guardada: mostrar el aviso. */
  | { status: "unset" }
  | { status: "set"; consent: CookieConsent };

export function useCookieConsent(): CookieConsentState {
  const raw = useSyncExternalStore(subscribeCookieConsent, readCookieConsentRaw, () => SERVER_SNAPSHOT);

  return useMemo<CookieConsentState>(() => {
    if (raw === SERVER_SNAPSHOT) {
      return { status: "pending" };
    }
    const consent = parseCookieConsent(raw);
    return consent ? { status: "set", consent } : { status: "unset" };
  }, [raw]);
}
