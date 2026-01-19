# Clases personalizadas en `app/(marketing)/components`

La siguiente tabla resume las utilidades y componentes CSS personalizados utilizados en los componentes de marketing. Todas las clases están definidas en `app/globals.css` mediante `@layer components` o `@layer utilities` para que Tailwind no las purgue.

| Clase | Descripción | Componentes que la utilizan |
| --- | --- | --- |
| `hero` | Contenedor principal del hero con posición relativa y desbordamiento controlado. | `Hero.tsx` |
| `bg-hero-light`, `bg-hero-dark` | Fondos gradientes para el hero en modo claro/oscuro. | `Hero.tsx` |
| `badge` | Chips decorativos para destacar texto. | `Hero.tsx`, `InfoBar.tsx`, `SpecialistsSlider.tsx`, `LoginModal.tsx` |
| `card` | Tarjetas con borde redondeado, borde translúcido y sombras animadas. | `Hero.tsx`, `Services.tsx`, `BookingForm.tsx`, `SpecialistsSlider.tsx` |
| `btn-primary`, `btn-secondary` | Variantes principales/secundarias de botones. | `Hero.tsx`, `Navbar.tsx`, `BookingForm.tsx`, `LoginModal.tsx` |
| `topbar` | Estilos sticky y con blur para el header. | `Navbar.tsx` |
| `mobile-menu` (+ `open`) | Panel desplegable para navegación móvil. | `Navbar.tsx` |
| `floating-actions`, `floating-action-btn` | Grupo de accesos rápidos flotantes. | `FloatingActions.tsx` |
| `icon-badge`, `icon-circle` | Contenedores para íconos con borde y fondo translúcido. | `ContactSection.tsx`, `BookingForm.tsx`, `Services.tsx` |
| `social-link` | Botones circulares para redes sociales. | `ContactSection.tsx` |
| `slider`, `slider-track`, `slider-btn`, `specialist`, `specialist-photo` | Slider horizontal para especialistas y sus tarjetas. | `SpecialistsSlider.tsx` |
| `bg-gradient` | Fondo gradiente usado en la tarjeta principal del formulario de agenda. | `BookingForm.tsx` |
| `input` | Campos de formulario con bordes redondeados y focus visible. | `BookingForm.tsx`, `LoginModal.tsx` |
| `form-feedback` | Mensajes de estado para el formulario. | `BookingForm.tsx` |
| `modal-backdrop`, `modal-content`, `modal-grid`, `modal-card`, `modal-close` | Estructura del modal de login con blur y sombras. | `LoginModal.tsx` |

Otras utilidades derivan de la paleta extendida definida en `tailwind.config.js`, por ejemplo `text-brand-teal`, `bg-brand-light/80`, `dark:bg-surface-elevated/80`, `shadow-glow` o `shadow-surface-dark`.
