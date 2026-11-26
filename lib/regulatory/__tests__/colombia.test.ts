import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOCUMENT_TYPE,
  DOCUMENT_TYPES,
  documentTypeLabel,
  documentTypeSchema,
  formatDocument,
  isDocumentTypeCode,
  rethusNumberSchema,
} from "@/lib/regulatory/colombia";

// DOG-34: tipo de documento (RIPS) y RETHUS.

describe("tipos de documento", () => {
  it("usa los códigos RIPS, sin repetidos, con CC por defecto", () => {
    const codes = DOCUMENT_TYPES.map((type) => type.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual(expect.arrayContaining(["CC", "TI", "RC", "CE", "PA", "PE", "PT", "AS", "MS"]));
    expect(DEFAULT_DOCUMENT_TYPE).toBe("CC");
  });

  it("valida códigos y devuelve etiquetas", () => {
    expect(documentTypeSchema.safeParse("TI").success).toBe(true);
    expect(documentTypeSchema.safeParse("XX").success).toBe(false);
    expect(isDocumentTypeCode("PA")).toBe(true);
    expect(isDocumentTypeCode(null)).toBe(false);
    expect(documentTypeLabel("CE")).toBe("Cédula de extranjería");
    expect(documentTypeLabel("XX")).toBeNull();
  });

  it("formatea tipo y número juntos", () => {
    expect(formatDocument("CC", "1020304050")).toBe("CC 1020304050");
    expect(formatDocument(null, "1020304050")).toBe("1020304050");
    expect(formatDocument("CC", null)).toBeNull();
  });
});

describe("rethusNumberSchema", () => {
  it("normaliza espacios y mayúsculas", () => {
    expect(rethusNumberSchema.parse(" 1234 5678 ")).toBe("12345678");
    expect(rethusNumberSchema.parse("od-2019-4411")).toBe("OD-2019-4411");
  });

  it("convierte la cadena vacía en null para poder borrarlo", () => {
    expect(rethusNumberSchema.parse("   ")).toBeNull();
  });

  it("rechaza caracteres raros o longitudes fuera de rango", () => {
    expect(rethusNumberSchema.safeParse("12<script>").success).toBe(false);
    expect(rethusNumberSchema.safeParse("12").success).toBe(false);
    expect(rethusNumberSchema.safeParse("9".repeat(31)).success).toBe(false);
  });
});
