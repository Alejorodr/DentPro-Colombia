"use client";

import { openCookiePreferences } from "@/lib/privacy/cookie-consent";

/** Botón para reabrir las preferencias de cookies (footer, política). */
export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      Gestionar cookies
    </button>
  );
}
