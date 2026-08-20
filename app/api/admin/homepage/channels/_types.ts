import { z } from "zod";

export const PLACEMENTS = ["INFOBAR", "FLOATING", "FOOTER", "BOOKING"] as const;
export const CHANNEL_TYPES = ["WHATSAPP", "PHONE", "EMAIL"] as const;

export function validateValue(type: string, value: string) {
  if (type === "EMAIL") return z.string().email().safeParse(value).success;
  // WhatsApp/Phone: digits only, 7-15 chars (E.164-ish, no strict validation needed here)
  return /^\d{7,15}$/.test(value);
}
