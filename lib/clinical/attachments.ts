export const CLINICAL_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const CLINICAL_ATTACHMENT_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

const CLINICAL_ATTACHMENT_EXTENSION_MAP: Record<(typeof CLINICAL_ATTACHMENT_ALLOWED_TYPES)[number], string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function isAllowedClinicalAttachmentType(type: string) {
  return CLINICAL_ATTACHMENT_ALLOWED_TYPES.includes(type as (typeof CLINICAL_ATTACHMENT_ALLOWED_TYPES)[number]);
}

export function sanitizeClinicalAttachmentFilename(originalName: string, mimeType: string): string {
  const sanitizedOriginal = originalName.split(/[/\\]/).pop() ?? "archivo";
  const trimmed = sanitizedOriginal.trim().replace(/[\r\n]/g, "");
  const extensionFromMime = CLINICAL_ATTACHMENT_EXTENSION_MAP[mimeType as keyof typeof CLINICAL_ATTACHMENT_EXTENSION_MAP];
  const rawBase = trimmed.replace(/\.[^/.]+$/, "");
  const slug = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const baseName = slug.length > 0 ? slug : "archivo";
  const extension = extensionFromMime ?? trimmed.split(".").pop() ?? "bin";
  return `${baseName}.${extension}`;
}

export function buildClinicalAttachmentStorageKey(params: {
  episodeId: string;
  filename: string;
}): string {
  const { episodeId, filename } = params;
  const uuid = crypto.randomUUID();
  return `clinical/${episodeId}/${uuid}-${filename}`;
}

export async function buildClinicalAttachmentChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
