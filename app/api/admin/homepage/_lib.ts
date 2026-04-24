import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { MARKETING_ICON_KEYS, type MarketingIconKey } from "@/lib/marketing/homepage-types";

const htmlTagPattern = /<[^>]+>/;

export const noHtml = (value: string) => !htmlTagPattern.test(value);

export function requiredText(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(noHtml, "No se permite HTML.");
}

export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine(noHtml, "No se permite HTML.")
    .transform((value) => (value === "" ? null : value));
}

function hasValidAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasValidHref(value: string) {
  if (value.startsWith("#") || value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function requiredAbsoluteHttpUrl(max: number) {
  return requiredText(1, max).refine(hasValidAbsoluteHttpUrl, "URL inválida.");
}

export function requiredHref(max: number) {
  return requiredText(1, max).refine(hasValidHref, "URL inválida.");
}

export function optionalAbsoluteHttpUrl(max: number) {
  return optionalText(max).refine(
    (value) => {
      if (value === null) return true;
      return hasValidAbsoluteHttpUrl(value);
    },
    { message: "URL inválida." },
  );
}

const marketingIconSchema = z.enum(MARKETING_ICON_KEYS);

export function normalizeMarketingIconKey(iconKey: string, fallback: MarketingIconKey): MarketingIconKey {
  const parsed = marketingIconSchema.safeParse(iconKey);
  return parsed.success ? parsed.data : fallback;
}

export async function requireAdmin() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { ok: false as const, response: errorResponse("No autorizado.", 401) };
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return { ok: false as const, response: errorResponse("No autorizado.", 403) };
  }

  return { ok: true as const, sessionUser };
}
