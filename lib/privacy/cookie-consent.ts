/**
 * Consentimiento de cookies (DOG-36).
 *
 * El sitio solo usa almacenamiento esencial propio (sesión del portal, seguridad y el tema
 * claro/oscuro). La única categoría opcional es "servicios de terceros": hoy, el mapa de
 * Google Maps de la sección de contacto, que al cargarse deja cookies de Google.
 *
 * La decisión se guarda en localStorage (no en una cookie): solo la necesita el navegador,
 * así no viaja al servidor en cada petición.
 */

export const COOKIE_CONSENT_STORAGE_KEY = "dentpro-cookie-consent";
/** Sube este número si cambian las categorías: vuelve a pedir el consentimiento. */
export const COOKIE_CONSENT_VERSION = 1;

const CONSENT_CHANGE_EVENT = "dentpro:cookie-consent-change";
const OPEN_PREFERENCES_EVENT = "dentpro:cookie-preferences-open";

export interface CookieConsent {
  version: number;
  /** Servicios de terceros que dejan sus propias cookies (mapa de Google). */
  thirdParty: boolean;
  /** ISO 8601. */
  updatedAt: string;
}

export function parseCookieConsent(raw: string | null | undefined): CookieConsent | null {
  if (!raw) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      (value as CookieConsent).version === COOKIE_CONSENT_VERSION &&
      typeof (value as CookieConsent).thirdParty === "boolean" &&
      typeof (value as CookieConsent).updatedAt === "string"
    ) {
      const consent = value as CookieConsent;
      return { version: consent.version, thirdParty: consent.thirdParty, updatedAt: consent.updatedAt };
    }
  } catch {
    // Valor corrupto: se trata como si no hubiera decisión.
  }

  return null;
}

/** Lee el valor crudo. `""` = sin decisión guardada (o localStorage no disponible). */
export function readCookieConsentRaw(): string {
  try {
    return window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveCookieConsent(choice: { thirdParty: boolean }, now: Date = new Date()): CookieConsent {
  const consent: CookieConsent = {
    version: COOKIE_CONSENT_VERSION,
    thirdParty: choice.thirdParty,
    updatedAt: now.toISOString(),
  };

  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Sin localStorage (modo privado estricto): la decisión vale solo para esta visita.
  }

  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT));
  return consent;
}

/** Suscripción para `useSyncExternalStore`: cambios en esta pestaña y en otras. */
export function subscribeCookieConsent(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === COOKIE_CONSENT_STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Abre el panel de preferencias desde cualquier parte (ej. enlace del footer). */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT));
}

export function subscribeOpenCookiePreferences(onOpen: () => void): () => void {
  window.addEventListener(OPEN_PREFERENCES_EVENT, onOpen);
  return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpen);
}
