import { withAbortTimeout } from "@/lib/http";

// Imágenes de hasta 5 MB.
const BLOB_UPLOAD_TIMEOUT_MS = 30_000;

export const MARKETING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MARKETING_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const MARKETING_IMAGE_EXTENSION_MAP: Record<(typeof MARKETING_IMAGE_ALLOWED_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MARKETING_UPLOAD_FOLDERS = [
  "marketing/homepage/hero",
  "marketing/homepage/testimonial",
  "marketing/specialists",
  "marketing/campaigns",
] as const;

export type MarketingUploadFolder = (typeof MARKETING_UPLOAD_FOLDERS)[number];

export function isAllowedMarketingImageType(type: string): type is (typeof MARKETING_IMAGE_ALLOWED_TYPES)[number] {
  return MARKETING_IMAGE_ALLOWED_TYPES.includes(type as (typeof MARKETING_IMAGE_ALLOWED_TYPES)[number]);
}

/**
 * Comprueba que los primeros bytes del archivo correspondan al tipo declarado (DOG-19).
 * `File.type` lo pone el navegador y el cliente lo controla: sin esto, un HTML o un SVG
 * renombrado como `image/png` se subiría al Blob público.
 */
export function matchesMarketingImageSignature(
  bytes: Uint8Array,
  type: (typeof MARKETING_IMAGE_ALLOWED_TYPES)[number],
): boolean {
  const startsWith = (signature: number[], offset = 0) =>
    bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte);

  switch (type) {
    case "image/jpeg":
      return startsWith([0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      // "RIFF" ???? "WEBP"
      return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8);
    default:
      return false;
  }
}

export function isAllowedMarketingUploadFolder(folder: string): folder is MarketingUploadFolder {
  return MARKETING_UPLOAD_FOLDERS.includes(folder as MarketingUploadFolder);
}

export function sanitizeMarketingImageFilename(originalName: string, mimeType: string) {
  const sanitizedOriginal = originalName.split(/[/\\]/).pop() ?? "imagen";
  const trimmed = sanitizedOriginal.trim().replace(/[\r\n]/g, "");
  const extensionFromMime = MARKETING_IMAGE_EXTENSION_MAP[mimeType as keyof typeof MARKETING_IMAGE_EXTENSION_MAP];
  const rawBase = trimmed.replace(/\.[^/.]+$/, "");
  const slug = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const baseName = slug.length > 0 ? slug : "imagen";
  const extension = extensionFromMime ?? "bin";
  return `${baseName}.${extension}`;
}

export function buildMarketingImageStorageKey(folder: MarketingUploadFolder, sanitizedFilename: string) {
  const uuid = crypto.randomUUID();
  return `${folder}/${uuid}-${sanitizedFilename}`;
}

export async function uploadPublicMarketingImage(file: File | Buffer, key: string, contentType: string) {
  const { put } = await import("@vercel/blob");
  const result = await withAbortTimeout(
    (abortSignal) => put(key, file, { access: "public", addRandomSuffix: false, contentType, abortSignal }),
    BLOB_UPLOAD_TIMEOUT_MS,
  );

  return result.url;
}
