/**
 * Serializa datos para un <script type="application/ld+json">.
 * `JSON.stringify` no escapa `<`: un valor con `</script>` cerraría la etiqueta e inyectaría HTML.
 * Escapar `<` como la secuencia JSON `<` mantiene el JSON válido y lo vuelve inerte (DOG-19).
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
