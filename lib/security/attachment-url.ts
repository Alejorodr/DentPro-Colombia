// Validación compartida de enlaces de adjuntos clínicos (url externa o dataUrl embebido).
// Un enlace inseguro (javascript:, http:, data:text/html, SVG con script) que se guarda y
// luego se abre desde el portal del paciente es XSS almacenado: se valida al escribir y
// otra vez al leer, porque pueden existir filas antiguas guardadas sin validación.

import { decodeBase64Header, matchesFileSignature } from "@/lib/security/file-signature";

const SAFE_DATA_URL_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function isSafeAttachmentUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeAttachmentDataUrl(value: string, mimeType?: string | null): boolean {
  const match = /^data:([^;,]+);base64,([a-z0-9+/]+=*)$/i.exec(value);
  if (!match || !SAFE_DATA_URL_MIME_TYPES.has(match[1].toLowerCase())) {
    return false;
  }
  if (mimeType && mimeType.toLowerCase() !== match[1].toLowerCase()) {
    return false;
  }
  // DOG-33: el contenido debe empezar con la firma del tipo declarado en el dataUrl.
  return matchesFileSignature(decodeBase64Header(match[2]), match[1]);
}

/** Devuelve los enlaces con los inseguros reemplazados por null (para respuestas y vistas). */
export function sanitizeAttachmentLinks<T extends { url?: string | null; dataUrl?: string | null; mimeType?: string | null }>(
  attachment: T,
): T {
  return {
    ...attachment,
    url: attachment.url && isSafeAttachmentUrl(attachment.url) ? attachment.url : null,
    dataUrl:
      attachment.dataUrl && isSafeAttachmentDataUrl(attachment.dataUrl, attachment.mimeType)
        ? attachment.dataUrl
        : null,
  };
}
