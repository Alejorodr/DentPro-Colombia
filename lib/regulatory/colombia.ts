import { z } from "zod";

/**
 * Datos de normativa de salud colombiana (DOG-34): tipo de documento del paciente (RIPS),
 * registro RETHUS del profesional y código CUPS del servicio.
 */

/**
 * Tipos de identificación de la tabla de RIPS (Ministerio de Salud). Se guardan los códigos
 * oficiales para poder reportar o facturar electrónicamente sin traducir valores.
 */
export const DOCUMENT_TYPES = [
  { code: "CC", label: "Cédula de ciudadanía" },
  { code: "TI", label: "Tarjeta de identidad" },
  { code: "RC", label: "Registro civil" },
  { code: "CN", label: "Certificado de nacido vivo" },
  { code: "CE", label: "Cédula de extranjería" },
  { code: "PA", label: "Pasaporte" },
  { code: "PE", label: "Permiso especial de permanencia" },
  { code: "PT", label: "Permiso por protección temporal" },
  { code: "DE", label: "Documento extranjero" },
  { code: "CD", label: "Carné diplomático" },
  { code: "SC", label: "Salvoconducto" },
  { code: "AS", label: "Adulto sin identificación" },
  { code: "MS", label: "Menor sin identificación" },
] as const;

export type DocumentTypeCode = (typeof DOCUMENT_TYPES)[number]["code"];

export const DEFAULT_DOCUMENT_TYPE: DocumentTypeCode = "CC";

const DOCUMENT_TYPE_CODES = DOCUMENT_TYPES.map((type) => type.code) as [DocumentTypeCode, ...DocumentTypeCode[]];

export function isDocumentTypeCode(value: unknown): value is DocumentTypeCode {
  return typeof value === "string" && (DOCUMENT_TYPE_CODES as readonly string[]).includes(value);
}

export function documentTypeLabel(code: string | null | undefined): string | null {
  return DOCUMENT_TYPES.find((type) => type.code === code)?.label ?? null;
}

/** `CC 1.020.304.050` → útil para fichas, impresiones y búsquedas visuales. */
export function formatDocument(type: string | null | undefined, number: string | null | undefined): string | null {
  if (!number) return null;
  return type ? `${type} ${number}` : number;
}

export const documentTypeSchema = z.enum(DOCUMENT_TYPE_CODES, {
  message: "Tipo de documento inválido.",
});

/**
 * Número de registro RETHUS. El formato varía según la época y la profesión, así que solo se
 * exigen letras, dígitos y guiones (4–30 caracteres). Cadena vacía → `null` (se puede borrar).
 */
export const rethusNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .refine((value) => value === "" || /^[A-Z0-9-]{4,30}$/.test(value), {
    message: "El número RETHUS solo admite letras, números y guiones (4 a 30 caracteres).",
  })
  .transform((value) => (value === "" ? null : value));

/**
 * Código CUPS: 6 dígitos. Se aceptan los separadores con que suele escribirse (`89.0.2.03`,
 * `890 203`) y se guarda solo con los dígitos. Cadena vacía → `null`.
 */
export const cupsCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s.-]/g, ""))
  .refine((value) => value === "" || /^\d{6}$/.test(value), {
    message: "El código CUPS debe tener 6 dígitos.",
  })
  .transform((value) => (value === "" ? null : value));
