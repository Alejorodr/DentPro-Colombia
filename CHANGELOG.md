# Changelog

## [Unreleased] - 2024-05-27
### Added
- Panel de métricas accesible vía `?liquidMetrics=1` o `data-liquid-metrics="available"`, con lectura en vivo de FPS, long tasks y comparativas de Performance/Lighthouse.
- Registro referencial de auditorías en MacBook Air M2 y Pixel 7 para repetir validaciones en QA.

### Changed
- Shader LiquidGlass actualizado con parámetros configurables de blur, refracción, mezcla de textura y alpha para mantener los retratos nítidos.
- API de métricas expuesta desde el shader para alimentar el panel y detectar suspensiones por bajo FPS.

### Accessibility
- Refuerzo de estados `:focus-visible` en enlaces y botones, además de desactivar animaciones y transiciones cuando `prefers-reduced-motion` está activo.

### Performance
- MacBook Air M2 (Chrome 125): shader activo ~58 fps, Lighthouse 94; shader desactivado ~60 fps, Lighthouse 96 (long tasks 12 ms vs 6 ms).
- Pixel 7 (Chrome 125): shader activo ~52 fps, Lighthouse 87; shader desactivado ~58 fps, Lighthouse 93 (long tasks 48 ms vs 18 ms).
- El panel permite alternar el shader para replicar estas mediciones y guardar eventos de bajo FPS.
