import { describe, expect, it } from "vitest";

import { safeJsonLd } from "@/lib/security/json-ld";

describe("safeJsonLd (DOG-19)", () => {
  it("escapa < para que un valor no pueda cerrar la etiqueta <script>", () => {
    const output = safeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(output).not.toContain("<");
    expect(output).toContain("\\u003c/script>");
  });

  it("sigue siendo JSON válido con los mismos datos", () => {
    const data = { "@type": "Dentist", name: "DentPro <Chía>", rating: 4.9 };
    expect(JSON.parse(safeJsonLd(data))).toEqual(data);
  });
});
