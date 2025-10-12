const html = document.documentElement;
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const darkToggle = document.getElementById('darkModeToggle');
const darkToggleMobile = document.getElementById('darkModeToggleMobile');
const track = document.getElementById('specialistsTrack');
const prevBtn = document.getElementById('prevSpecialist');
const nextBtn = document.getElementById('nextSpecialist');
const yearEl = document.getElementById('year');
const bookingForm = document.getElementById('bookingForm');

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function getStoredTheme() {
  return localStorage.getItem('dentpro-theme');
}

function applyTheme(theme) {
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('dentpro-theme', isDark ? 'dark' : 'light');
}

applyTheme(getStoredTheme() || (prefersDark.matches ? 'dark' : 'light'));

prefersDark.addEventListener('change', (event) => {
  if (!getStoredTheme()) {
    applyTheme(event.matches ? 'dark' : 'light');
  }
});

[darkToggle, darkToggleMobile].forEach((button) => {
  button?.addEventListener('click', () => toggleTheme());
});

mobileMenuBtn?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('open');
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    mobileMenu?.classList.remove('open');
  }
});

function setYear() {
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

setYear();

function createFeedback(message, type = 'success') {
  const existing = bookingForm?.querySelector('.form-feedback');
  existing?.remove();
  const feedback = document.createElement('p');
  feedback.className = `form-feedback ${type}`;
  feedback.textContent = message;
  return feedback;
}

bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const feedback = createFeedback('¡Gracias! Un asesor se comunicará contigo muy pronto.');
  bookingForm.appendChild(feedback);
  bookingForm.reset();
  window.scrollTo({ top: bookingForm.offsetTop - 120, behavior: 'smooth' });
});

function setupSlider() {
  if (!track) return;
  const slides = Array.from(track.children);
  let index = 0;

  function update() {
    const slideWidth = slides[0]?.getBoundingClientRect().width || 0;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap) || parseFloat(styles.gap) || 0;
    const offset = index * (slideWidth + gap);
    track.style.transform = `translateX(-${offset}px)`;
    prevBtn && (prevBtn.disabled = index === 0);
    nextBtn && (nextBtn.disabled = index >= slides.length - visibleSlides());
  }

  function visibleSlides() {
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 1024) return 2;
    return 1;
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
