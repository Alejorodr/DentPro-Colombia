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

/*
 * Menú móvil: gestiona apertura/cierre mediante clics en el botón, enlaces internos
 * y tecla Escape para asegurar accesibilidad con aria-expanded/label.
 */
function setMobileMenuState(isOpen) {
  if (!mobileMenu || !mobileMenuBtn) {
    return;
  }
  mobileMenu.classList.toggle('open', isOpen);
  mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
  mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
}

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

/*
 * Año dinámico: actualiza el pie con el año actual en la carga inicial.
 */
function setYear() {
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

setYear();

/*
 * Formulario de agenda: muestra mensajes de retroalimentación y evita recarga
 * al interceptar el submit, manteniendo la experiencia en una sola página.
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

/*
 * Slider de especialistas: controla la traslación horizontal con eventos click en
 * prev/next y reajusta límites en el evento resize del viewport.
 */
function setupSlider() {
  if (!track) return;
  const slides = Array.from(track.children);
  if (!slides.length) return;

  let index = 0;

  function visibleSlides() {
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 1024) return 2;
    return 1;
  }

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
