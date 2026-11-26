/**
 * Firmas de archivo (magic bytes) para validar el contenido real de los adjuntos (DOG-33).
 *
 * El tipo MIME lo declara quien sube el archivo; la firma dice qué hay realmente dentro.
 * Un HTML renombrado como `algo.pdf` pasa la validación por tipo, pero no la de firma.
 */

type SignaturePart = { offset: number; bytes: readonly number[] };

const FILE_SIGNATURES: Record<string, readonly SignaturePart[]> = {
  "application/pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }], // %PDF-
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  // RIFF....WEBP
  "image/webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
};

/** Bytes del inicio del archivo que bastan para comprobar cualquier firma conocida. */
const FILE_SIGNATURE_HEADER_BYTES = 16;

/** `true` solo si `bytes` empieza con la firma del tipo declarado (y ese tipo es conocido). */
export function matchesFileSignature(bytes: Uint8Array, declaredType: string): boolean {
  const parts = FILE_SIGNATURES[declaredType.toLowerCase()];
  if (!parts) {
    return false;
  }
  return parts.every(
    ({ offset, bytes: expected }) =>
      bytes.length >= offset + expected.length && expected.every((byte, index) => bytes[offset + index] === byte),
  );
}

/** Decodifica solo el inicio de un payload base64 (sin cargar el archivo completo). */
export function decodeBase64Header(base64: string, byteCount = FILE_SIGNATURE_HEADER_BYTES): Uint8Array {
  // 4 caracteres base64 = 3 bytes; se toma un múltiplo de 4 para no romper el decodificado.
  const chars = Math.ceil(byteCount / 3) * 4;
  try {
    return Uint8Array.from(Buffer.from(base64.slice(0, chars), "base64"));
  } catch {
    return new Uint8Array();
  }
}
