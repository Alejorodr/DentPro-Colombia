import { describe, expect, it } from "vitest";

import { HOMEPAGE_DEFAULT_CONTENT } from "../homepage-defaults";

/** Todos los textos (strings) del contenido por defecto, con su ruta para el mensaje de error. */
function collectStrings(value: unknown, path = "content"): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => collectStrings(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => collectStrings(item, `${path}.${key}`));
  }
  return [];
}

const texts = collectStrings(HOMEPAGE_DEFAULT_CONTENT).filter(
  ([path, text]) => !/(href|url|src|icon|value|slug|id)\b/i.test(path.split(".").pop() ?? "") && !/^(https?:|\/|#|mailto:|tel:)/.test(text),
);

// DOG-63: el sitio se regionaliza para Colombia (ver CLAUDE.md: voz, horarios y moneda).
describe("contenido por defecto del home, regionalizado para Colombia", () => {
  it("los horarios usan 24 h y raya (8:00–19:00), no am/pm", () => {
    const offenders = texts.filter(([, text]) => /\d{1,2}(:\d{2})?\s?(am|pm)\b/i.test(text) || /\d:\d{2}-\d/.test(text));
    expect(offenders).toEqual([]);
  });

  it("trata de tú, nunca de usted", () => {
    const offenders = texts.filter(([, text]) =>
      /\b(usted|ustedes|contáctenos|llámenos|escríbanos|agende|reserve su|su cita|sus datos)\b/i.test(text),
    );
    expect(offenders).toEqual([]);
  });

  it("no mezcla términos en inglés", () => {
    const offenders = texts.filter(([, text]) =>
      /\b(patient care|book now|contact us|learn more|sign in|sign up|read more)\b/i.test(text),
    );
    expect(offenders).toEqual([]);
  });

  it("los precios, si aparecen, van en pesos sin decimales ($1.250.000)", () => {
    const offenders = texts.filter(([, text]) => /(US\$|USD|€)|\$\s?\d+([.,]\d{3})*,\d{2}\b/.test(text));
    expect(offenders).toEqual([]);
  });
});
