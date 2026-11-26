import { describe, expect, it } from "vitest";

import {
  CUPS_GROUPS,
  CUPS_PROCEDURE_COUNT,
  findCupsProcedure,
  isCatalogCupsCode,
} from "@/lib/regulatory/cups-odontologia";

// DOG-42: catálogo CUPS odontológico de la Resolución 2706 de 2025.
describe("catálogo CUPS odontológico", () => {
  const codes = CUPS_GROUPS.flatMap((group) => group.procedures.map((procedure) => procedure.code));

  it("tiene los 177 códigos odontológicos, sin repetidos", () => {
    expect(codes).toHaveLength(177);
    expect(new Set(codes).size).toBe(177);
    expect(CUPS_PROCEDURE_COUNT).toBe(177);
  });

  it("todos los códigos son de 6 dígitos y tienen nombre", () => {
    for (const group of CUPS_GROUPS) {
      expect(group.procedures.length).toBeGreaterThan(0);
      for (const procedure of group.procedures) {
        expect(procedure.code).toMatch(/^\d{6}$/);
        expect(procedure.name.trim()).not.toBe("");
      }
    }
  });

  it("los ids de grupo son únicos", () => {
    const ids = CUPS_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reconoce solo códigos del catálogo", () => {
    expect(isCatalogCupsCode("237301")).toBe(true);
    expect(isCatalogCupsCode("999999")).toBe(false);
    expect(isCatalogCupsCode(237301)).toBe(false);
    expect(findCupsProcedure("893106")).toMatchObject({ groupId: "ortodoncia" });
    expect(findCupsProcedure("000000")).toBeNull();
  });
});
