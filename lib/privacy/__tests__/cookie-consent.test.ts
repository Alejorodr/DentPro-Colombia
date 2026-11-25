import { afterEach, describe, expect, it, vi } from "vitest";

import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  openCookiePreferences,
  parseCookieConsent,
  readCookieConsentRaw,
  saveCookieConsent,
  subscribeCookieConsent,
  subscribeOpenCookiePreferences,
} from "@/lib/privacy/cookie-consent";

describe("cookie consent", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("parsea una decisión válida de la versión actual", () => {
    const raw = JSON.stringify({ version: COOKIE_CONSENT_VERSION, thirdParty: true, updatedAt: "2026-11-25T12:00:00.000Z" });
    expect(parseCookieConsent(raw)).toEqual({
      version: COOKIE_CONSENT_VERSION,
      thirdParty: true,
      updatedAt: "2026-11-25T12:00:00.000Z",
    });
  });

  it("ignora valores vacíos, corruptos, de otra versión o con tipos inválidos", () => {
    expect(parseCookieConsent(null)).toBeNull();
    expect(parseCookieConsent("")).toBeNull();
    expect(parseCookieConsent("{no-json")).toBeNull();
    expect(parseCookieConsent(JSON.stringify({ version: 0, thirdParty: true, updatedAt: "x" }))).toBeNull();
    expect(parseCookieConsent(JSON.stringify({ version: COOKIE_CONSENT_VERSION, thirdParty: "si", updatedAt: "x" }))).toBeNull();
  });

  it("guarda la decisión y avisa a los suscriptores", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCookieConsent(listener);

    const consent = saveCookieConsent({ thirdParty: false }, new Date("2026-11-25T12:00:00.000Z"));

    expect(consent).toEqual({ version: COOKIE_CONSENT_VERSION, thirdParty: false, updatedAt: "2026-11-25T12:00:00.000Z" });
    expect(parseCookieConsent(readCookieConsentRaw())).toEqual(consent);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    saveCookieConsent({ thirdParty: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reacciona a cambios hechos en otra pestaña", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCookieConsent(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: COOKIE_CONSENT_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent("storage", { key: "theme" }));

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("devuelve cadena vacía si localStorage falla", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readCookieConsentRaw()).toBe("");
    spy.mockRestore();
  });

  it("abre las preferencias mediante un evento", () => {
    const onOpen = vi.fn();
    const unsubscribe = subscribeOpenCookiePreferences(onOpen);
    openCookiePreferences();
    expect(onOpen).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
