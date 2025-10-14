/**
 * @module js/main
 * @description Gestiona las interacciones principales del sitio, como menú móvil, slider de especialistas y formulario de agendamiento, coordinándose con los elementos definidos en el HTML.
 */
import { registerThemeToggle } from './app.js';

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const darkToggle = document.getElementById('darkModeToggle');
const track = document.getElementById('specialistsTrack');
const prevBtn = document.getElementById('prevSpecialist');
const nextBtn = document.getElementById('nextSpecialist');
const yearEl = document.getElementById('year');
const bookingForm = document.getElementById('bookingForm');

registerThemeToggle(darkToggle);

/**
 * Establece el estado del menú móvil y sincroniza atributos de accesibilidad.
 * @param {boolean} isOpen - Indica si el menú debe mostrarse abierto.
 * @returns {void}
 * @sideeffects Modifica clases y atributos aria en el DOM del menú móvil y el botón.
 */
function setMobileMenuState(isOpen) {
  if (!mobileMenu || !mobileMenuBtn) {
    return;
  }
  mobileMenu.classList.toggle('open', isOpen);
  mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
}

/**
 * Alterna el estado del menú móvil entre abierto y cerrado.
 * @returns {void}
 * @sideeffects Invoca {@link setMobileMenuState} para actualizar el DOM y los atributos aria.
 */
function toggleMobileMenu() {
  const isOpen = !mobileMenu?.classList.contains('open');
  setMobileMenuState(isOpen);
}

setMobileMenuState(false);

mobileMenuBtn?.addEventListener('click', () => {
  toggleMobileMenu();
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMobileMenuState(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMobileMenuState(false);
  }
});

/**
 * Actualiza el elemento de año con el año actual.
 * @returns {void}
 * @sideeffects Modifica el texto del nodo asociado al pie de página.
 */
function setYear() {
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

setYear();

/**
 * Crea un nodo de retroalimentación para el formulario de agendamiento.
 * @param {string} message - Mensaje a mostrar al usuario.
 * @param {('success'|'error')} [type='success'] - Tipo de mensaje que define el estilo visual.
 * @returns {HTMLParagraphElement} Nodo listo para insertar en el formulario.
 * @sideeffects Elimina cualquier mensaje previo presente en el formulario.
 */
function createFeedback(message, type = 'success') {
  const existing = bookingForm?.querySelector('.form-feedback');
  existing?.remove();
  const feedback = document.createElement('p');
  feedback.className = 'form-feedback';
  feedback.classList.add(
    'rounded-2xl',
    'border',
    'px-4',
    'py-3',
    'text-sm',
    'font-medium',
    'backdrop-blur',
    'transition-colors'
  );
  if (type === 'error') {
    feedback.classList.add(
      'border-rose-400/40',
      'bg-rose-100/60',
      'text-rose-700',
      'dark:border-rose-300/40',
      'dark:bg-rose-500/20',
      'dark:text-rose-100'
    );
  } else {
    feedback.classList.add(
      'border-brand-teal/40',
      'bg-brand-light/60',
      'text-brand-indigo',
      'dark:border-accent-cyan/40',
      'dark:bg-accent-cyan/10',
      'dark:text-accent-cyan'
    );
  }
  feedback.textContent = message;
  return feedback;
}

bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault(); // Evita la recarga para poder mostrar el mensaje en la misma vista.
  const feedback = createFeedback('¡Gracias! Un asesor se comunicará contigo muy pronto.');
  bookingForm.appendChild(feedback);
  bookingForm.reset();
  window.scrollTo({ top: bookingForm.offsetTop - 120, behavior: 'smooth' }); // Ajuste para no ocultar el feedback bajo la cabecera fija.
});

/**
 * Inicializa la interacción del slider de especialistas.
 * @returns {void}
 * @sideeffects Registra listeners de clic y resize y manipula estilos inline del track.
 */
function setupSlider() {
  if (!track) return;
  const slides = Array.from(track.children);
  if (!slides.length) return;

  let index = 0;

  /**
   * Determina la cantidad de diapositivas visibles según el ancho del viewport.
   * @returns {number} Número de tarjetas visibles.
   */
  function visibleSlides() {
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 1024) return 2;
    return 1;
  }

  /**
   * Recalcula la posición del track y actualiza los botones de navegación.
   * @returns {void}
   * @sideeffects Ajusta transformaciones CSS y estados disabled de los controles.
   */
  function update() {
    const slideWidth = slides[0]?.getBoundingClientRect().width || 0;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 0;
    const offset = index * (slideWidth + gap); // Considera el gap para alinear correctamente el desplazamiento.
    track.style.transform = `translateX(-${offset}px)`;
    if (prevBtn) {
      prevBtn.disabled = index === 0;
    }
    if (nextBtn) {
      nextBtn.disabled = index >= slides.length - visibleSlides();
    }
  }

  prevBtn?.addEventListener('click', () => {
    index = Math.max(0, index - 1);
    update();
  });

  nextBtn?.addEventListener('click', () => {
    index = Math.min(slides.length - visibleSlides(), index + 1);
    update();
  });

  window.addEventListener('resize', () => {
    index = Math.min(index, Math.max(0, slides.length - visibleSlides()));
    update();
  });

  update();
}

setupSlider();
