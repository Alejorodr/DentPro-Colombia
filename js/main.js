import { registerThemeToggle } from './app.js';
import { mountLiquidGlass } from './liquidGlass.js';

const LIQUID_GLASS_PREF_KEY = 'dentpro:liquid-glass-preference';

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const darkToggle = document.getElementById('darkModeToggle');
const track = document.getElementById('specialistsTrack');
const prevBtn = document.getElementById('prevSpecialist');
const nextBtn = document.getElementById('nextSpecialist');
const yearEl = document.getElementById('year');
const bookingForm = document.getElementById('bookingForm');
const heroLiquidHost = document.getElementById('heroLiquidHost');
const heroTextPanel = document.querySelector('[data-hero-text-panel]');

function getStoredLiquidGlassPreference() {
  try {
    return localStorage.getItem(LIQUID_GLASS_PREF_KEY);
  } catch (error) {
    return null;
  }
}

export function setLiquidGlassPreference(isEnabled) {
  try {
    if (typeof isEnabled === 'undefined' || isEnabled === null) {
      localStorage.removeItem(LIQUID_GLASS_PREF_KEY);
      return;
    }
    localStorage.setItem(LIQUID_GLASS_PREF_KEY, isEnabled ? 'enabled' : 'disabled');
  } catch (error) {
    // No-op: storage might be unavailable (private mode, etc.)
  }
}

function isViewportEligible() {
  if (typeof window.matchMedia !== 'function') {
    return window.innerWidth >= 1024;
  }
  return window.matchMedia('(min-width: 1024px)').matches;
}

function hasWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (error) {
    return false;
  }
}

function prefersReducedMotion() {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function shouldEnableLiquidGlass() {
  if (!isViewportEligible()) {
    return false;
  }

  if (!hasWebGLSupport()) {
    return false;
  }

  if (prefersReducedMotion()) {
    return false;
  }

  return true;
}

registerThemeToggle(darkToggle);

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

function setYear() {
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

setYear();

function detectStagingEnvironment() {
  const htmlEnv = document.documentElement.dataset.environment;
  if (htmlEnv) {
    return htmlEnv.toLowerCase() === 'staging';
  }
  const metaEnv = document.querySelector('meta[name="app:environment"]')?.getAttribute('content');
  if (metaEnv) {
    return metaEnv.toLowerCase() === 'staging';
  }
  const host = window.location.hostname;
  return host.includes('staging') || host.includes('localhost') || host.startsWith('127.');
}

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
  event.preventDefault();
  const feedback = createFeedback('¡Gracias! Un asesor se comunicará contigo muy pronto.');
  bookingForm.appendChild(feedback);
  bookingForm.reset();
  window.scrollTo({ top: bookingForm.offsetTop - 120, behavior: 'smooth' });
});

function setupHeroLiquidGlass() {
  if (!heroLiquidHost) {
    return;
  }

  if (heroTextPanel) {
    heroTextPanel.classList.add('relative');
    heroTextPanel.style.zIndex = heroTextPanel.style.zIndex || '2';
  }

  const isStaging = detectStagingEnvironment();
  if (isStaging) {
    heroLiquidHost.dataset.liquidExperiment = 'hero-v1';
  }

  if (heroLiquidHost.dataset.liquidExperiment !== 'hero-v1') {
    return;
  }

  const storedPreference = getStoredLiquidGlassPreference();
  const isPreferenceEnabled = storedPreference !== 'disabled';
  const canRunLiquidGlass = isPreferenceEnabled && shouldEnableLiquidGlass();

  heroLiquidHost.dataset.liquidEnabled = String(canRunLiquidGlass);
  heroLiquidHost.dataset.liquidPreference = storedPreference || 'auto';

  if (!canRunLiquidGlass) {
    heroLiquidHost.dataset.liquidStatus = 'disabled';
    return;
  }

  heroLiquidHost.dataset.liquidStatus = 'initializing';
  const instance = mountLiquidGlass({
    targetEl: heroLiquidHost,
    iconsEl: heroLiquidHost,
    backgroundSrc: heroLiquidHost.dataset.liquidBackground || null,
  });

  const isActive = instance.isActive();
  heroLiquidHost.dataset.liquidStatus = isActive ? 'running' : 'disabled';
  heroLiquidHost.dataset.liquidEnabled = String(isActive);

  if (!isActive) {
    return;
  }

  instance.onLowFps(({ fps }) => {
    instance.destroy();
    heroLiquidHost.dataset.liquidStatus = 'suspended';
    heroLiquidHost.dataset.liquidEnabled = 'false';
    heroLiquidHost.dataset.liquidFps = String(Math.round(fps));
  });
}

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
setupHeroLiquidGlass();
