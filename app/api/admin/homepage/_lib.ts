import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";

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

export function optionalAbsoluteHttpUrl(max: number) {
  return optionalText(max).refine(
    (value) => {
      if (value === null) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL inválida." },
  );
}

export async function requireAdmin() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return { ok: false as const, response: errorResponse("No autorizado.", 401) };
  }

  return { ok: true as const, sessionUser };
}
