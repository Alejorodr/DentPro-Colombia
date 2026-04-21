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
  const result = await put(key, file, {
    access: "public",
    addRandomSuffix: false,
    contentType,
  });

  return result.url;
}
