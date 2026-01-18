export const CLINICAL_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const CLINICAL_ATTACHMENT_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export function isAllowedClinicalAttachmentType(type: string) {
  return CLINICAL_ATTACHMENT_ALLOWED_TYPES.includes(type as (typeof CLINICAL_ATTACHMENT_ALLOWED_TYPES)[number]);
}
