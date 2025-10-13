import { registerThemeToggle } from './app.js';
import { mountLiquidGlass } from './liquidGlass.js';
import { initLiquidMetricsPanel, isLiquidMetricsEnabled } from './liquidMetrics.js';

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

const LIQUID_GLASS_PREF_EVENT = 'liquid-glass:preference-change';
const LIQUID_GLASS_TELEMETRY_EVENT = 'liquid-glass:telemetry';
const liquidGlassControllers = new Set();

function broadcastLiquidGlassPreference(preference) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  try {
    window.dispatchEvent(
      new CustomEvent(LIQUID_GLASS_PREF_EVENT, {
        detail: { preference: preference ?? null },
      })
    );
  } catch (error) {
    console.error('[liquidGlass] Failed to broadcast preference change', error);
  }
}

function emitLiquidGlassTelemetry(payload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const eventDetail = {
    event: 'liquid_glass_enabled',
    timestamp: new Date().toISOString(),
    ...payload,
  };

  try {
    const layer = Array.isArray(window.dataLayer) ? window.dataLayer : (window.dataLayer = []);
    layer.push(eventDetail);
  } catch (error) {
    console.error('[liquidGlass] Failed to push telemetry event', error);
  }

  try {
    window.dispatchEvent(
      new CustomEvent(LIQUID_GLASS_TELEMETRY_EVENT, {
        detail: eventDetail,
      })
    );
  } catch (error) {
    console.error('[liquidGlass] Failed to dispatch telemetry event', error);
  }

  const hostname = window.location?.hostname || '';
  if (hostname.includes('localhost') || hostname.startsWith('127.')) {
    console.debug('[telemetry]', eventDetail);
  }
}

function registerLiquidGlassController(instance, meta = {}) {
  if (!instance) {
    return () => {};
  }
  const record = { instance, meta };
  liquidGlassControllers.add(record);
  return () => {
    liquidGlassControllers.delete(record);
  };
}

function pauseLiquidGlassControllers(origin = 'unspecified') {
  liquidGlassControllers.forEach(({ instance, meta }) => {
    try {
      instance.pause?.(origin, meta);
    } catch (error) {
      console.error('[liquidGlass] Failed to pause instance', error, meta);
    }
  });
}

function resumeLiquidGlassControllers(origin = 'unspecified') {
  liquidGlassControllers.forEach(({ instance, meta }) => {
    try {
      instance.resume?.(origin, meta);
    } catch (error) {
      console.error('[liquidGlass] Failed to resume instance', error, meta);
    }
  });
}

function getStoredLiquidGlassPreference() {
  try {
    return localStorage.getItem(LIQUID_GLASS_PREF_KEY);
  } catch (error) {
    return null;
  }
}

export function setLiquidGlassPreference(isEnabled) {
  let nextPreference = null;
  if (isEnabled === true) {
    nextPreference = 'enabled';
  } else if (isEnabled === false) {
    nextPreference = 'disabled';
  }

  try {
    if (!nextPreference) {
      localStorage.removeItem(LIQUID_GLASS_PREF_KEY);
    } else {
      localStorage.setItem(LIQUID_GLASS_PREF_KEY, nextPreference);
    }
  } catch (error) {
    // No-op: storage might be unavailable (private mode, etc.)
  }

  broadcastLiquidGlassPreference(nextPreference);
  return nextPreference;
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

  const metricsEnabled = isLiquidMetricsEnabled(heroLiquidHost);
  const metricsPanel = metricsEnabled
    ? initLiquidMetricsPanel({
        host: heroLiquidHost,
        reduceMotion: prefersReducedMotion(),
      })
    : null;

  const parseSetting = (value, fallback, min, max) => {
    const numeric = Number.parseFloat(value);
    if (Number.isFinite(numeric)) {
      if (Number.isFinite(min) && numeric < min) {
        return min;
      }
      if (Number.isFinite(max) && numeric > max) {
        return max;
      }
      return numeric;
    }
    return fallback;
  };

  const readSettings = () => ({
    blurRadius: parseSetting(heroLiquidHost.dataset.liquidBlur, 4.5, 0, 18),
    refractionIntensity: parseSetting(heroLiquidHost.dataset.liquidRefraction, 0.08, 0, 0.6),
    textureMix: parseSetting(heroLiquidHost.dataset.liquidTexture, 0.65, 0, 1),
    patternStrength: parseSetting(heroLiquidHost.dataset.liquidPattern, 0.45, 0, 1),
    alpha: parseSetting(heroLiquidHost.dataset.liquidAlpha, 0.6, 0.1, 0.9),
  });

  metricsPanel?.updateSettings(readSettings());

  let storedPreference = getStoredLiquidGlassPreference();
  let instance = null;
  let unsubscribeMetrics = null;
  let unregisterInstance = null;

  const updatePreferenceDataset = () => {
    heroLiquidHost.dataset.liquidPreference = storedPreference || 'auto';
    metricsPanel?.updatePreference(heroLiquidHost.dataset.liquidPreference);
  };

  const updateEligibility = () => {
    const eligible = shouldEnableLiquidGlass();
    heroLiquidHost.dataset.liquidEligibility = String(eligible);
    metricsPanel?.updateEligibility(eligible);
    return eligible;
  };

  const destroyInstance = () => {
    if (typeof unsubscribeMetrics === 'function') {
      unsubscribeMetrics();
    }
    unsubscribeMetrics = null;
    if (instance) {
      instance.destroy();
      instance = null;
    }
    if (unregisterInstance) {
      unregisterInstance();
      unregisterInstance = null;
    }
    delete heroLiquidHost.dataset.liquidFps;
  };

  const setDisabledState = (status, reason, extra = {}) => {
    destroyInstance();
    heroLiquidHost.dataset.liquidEnabled = 'false';
    heroLiquidHost.dataset.liquidStatus = status;
    if (reason) {
      heroLiquidHost.dataset.liquidReason = reason;
    } else {
      delete heroLiquidHost.dataset.liquidReason;
    }
    metricsPanel?.updateState(false, reason || status);
    emitLiquidGlassTelemetry({
      host: 'hero',
      enabled: false,
      status,
      reason: reason || null,
      experiment: heroLiquidHost.dataset.liquidExperiment || null,
      preference: storedPreference || 'auto',
      ...extra,
    });
  };

  const attachMetrics = () => {
    if (!metricsPanel || typeof instance?.onMetrics !== 'function') {
      return;
    }
    unsubscribeMetrics = instance.onMetrics((payload) => {
      metricsPanel.updateMetrics(payload);
      heroLiquidHost.dataset.liquidFps = String(Math.round(payload.average));
    });
  };

  const activate = (origin = 'auto') => {
    destroyInstance();
    const eligible = updateEligibility();
    if (storedPreference === 'disabled') {
      setDisabledState('disabled', 'preferencia-usuario', { origin, eligibility });
      return;
    }
    if (!eligible) {
      setDisabledState('blocked', 'dispositivo-no-elegible', { origin, eligibility });
      return;
    }

    heroLiquidHost.dataset.liquidStatus = 'initializing';
    delete heroLiquidHost.dataset.liquidReason;
    heroLiquidHost.dataset.liquidEnabled = 'true';

    const settings = readSettings();
    metricsPanel?.updateSettings(settings);

    instance = mountLiquidGlass({
      targetEl: heroLiquidHost,
      iconsEl: heroLiquidHost,
      backgroundSrc: heroLiquidHost.dataset.liquidBackground || null,
      settings,
    });

    const active = instance.isActive();
    heroLiquidHost.dataset.liquidEnabled = String(active);
    heroLiquidHost.dataset.liquidStatus = active ? 'running' : 'disabled';

    if (!active) {
      setDisabledState('disabled', 'webgl-no-disponible', { origin, eligibility });
      return;
    }

    metricsPanel?.updateState(true, origin);
    attachMetrics();

    if (unregisterInstance) {
      unregisterInstance();
    }
    unregisterInstance = registerLiquidGlassController(instance, {
      id: 'hero',
      host: heroLiquidHost,
      experiment: heroLiquidHost.dataset.liquidExperiment || null,
      origin,
    });

    emitLiquidGlassTelemetry({
      host: 'hero',
      enabled: true,
      status: 'running',
      experiment: heroLiquidHost.dataset.liquidExperiment || null,
      preference: storedPreference || 'auto',
      eligibility,
      origin,
    });

    instance.onLowFps(({ fps }) => {
      setDisabledState('suspended', 'low-fps', { fps: Math.round(fps) });
      heroLiquidHost.dataset.liquidFps = String(Math.round(fps));
      metricsPanel?.pushEvent({ type: 'lowFps', fps });
    });
  };

  const deactivate = (reason = 'manual') => {
    setDisabledState('disabled', reason, { origin: reason });
  };

  updatePreferenceDataset();
  const eligible = updateEligibility();

  if (storedPreference === 'disabled') {
    setDisabledState('disabled', 'preferencia-usuario');
  } else if (!eligible) {
    setDisabledState('blocked', 'dispositivo-no-elegible');
  } else {
    activate('initial');
  }

  if (metricsPanel) {
    metricsPanel.bindControls({
      onEnable() {
        storedPreference = setLiquidGlassPreference(true) || 'enabled';
        updatePreferenceDataset();
        metricsPanel.pushEvent({ type: 'preference', message: 'Shader activado manualmente.' });
        activate('manual');
      },
      onDisable() {
        storedPreference = setLiquidGlassPreference(false) || 'disabled';
        updatePreferenceDataset();
        metricsPanel.pushEvent({ type: 'preference', message: 'Shader desactivado manualmente.' });
        deactivate('manual');
      },
      onReset() {
        const preference = setLiquidGlassPreference(null);
        storedPreference = preference ?? getStoredLiquidGlassPreference();
        updatePreferenceDataset();
        metricsPanel.pushEvent({ type: 'preference', message: 'Preferencia restablecida.' });
        activate('reset');
      },
    });
  }
}

function setupSpecialistLiquidGlass() {
  if (!track) {
    return;
  }

  const firstSpecialistCard = track.querySelector('.card.specialist');
  if (!firstSpecialistCard) {
    return;
  }

  // Escala gradual: sólo habilitar cuando la tarjeta participa del experimento monitoreado.
  const experimentId = firstSpecialistCard.dataset.liquidExperiment;

  if (experimentId !== 'specialist-card-v1') {
    return;
  }

  let storedPreference = getStoredLiquidGlassPreference();
  let instance = null;
  let unregisterInstance = null;

  const normalizePreference = (value) => {
    if (value === 'enabled' || value === 'disabled') {
      return value;
    }
    return null;
  };

  const updatePreferenceDataset = () => {
    firstSpecialistCard.dataset.liquidPreference = storedPreference || 'auto';
  };

  const updateEligibility = () => {
    const eligible = shouldEnableLiquidGlass();
    firstSpecialistCard.dataset.liquidEligibility = String(eligible);
    return eligible;
  };

  const destroyInstance = () => {
    if (instance) {
      instance.destroy();
      instance = null;
    }
    if (unregisterInstance) {
      unregisterInstance();
      unregisterInstance = null;
    }
    delete firstSpecialistCard.dataset.liquidFps;
  };

  const setDisabledState = (status, reason, extra = {}) => {
    destroyInstance();
    updatePreferenceDataset();
    const eligible = updateEligibility();
    firstSpecialistCard.dataset.liquidEnabled = 'false';
    firstSpecialistCard.dataset.liquidStatus = status;
    if (reason) {
      firstSpecialistCard.dataset.liquidReason = reason;
    } else {
      delete firstSpecialistCard.dataset.liquidReason;
    }
    emitLiquidGlassTelemetry({
      host: 'specialist-card',
      enabled: false,
      status,
      reason: reason || null,
      experiment: experimentId,
      preference: storedPreference || 'auto',
      eligibility: eligible,
      ...extra,
    });
  };

  const activate = (origin = 'auto') => {
    destroyInstance();
    updatePreferenceDataset();
    const eligible = updateEligibility();

    if (storedPreference === 'disabled') {
      setDisabledState('disabled', 'preferencia-usuario', { origin });
      return;
    }

    if (!eligible) {
      setDisabledState('blocked', 'dispositivo-no-elegible', { origin });
      return;
    }

    firstSpecialistCard.dataset.liquidStatus = 'initializing';
    delete firstSpecialistCard.dataset.liquidReason;
    firstSpecialistCard.dataset.liquidEnabled = 'true';

    const settings = {
      blurRadius: 3.2,
      refractionIntensity: 0.06,
      textureMix: 0.45,
      patternStrength: 0.38,
      alpha: 0.55,
    };

    instance = mountLiquidGlass({
      targetEl: firstSpecialistCard,
      iconsEl: firstSpecialistCard,
      backgroundSrc: firstSpecialistCard.dataset.liquidBackground || null,
      settings,
    });

    const active = instance.isActive();
    firstSpecialistCard.dataset.liquidEnabled = String(active);
    firstSpecialistCard.dataset.liquidStatus = active ? 'running' : 'disabled';

    if (!active) {
      setDisabledState('disabled', 'webgl-no-disponible', { origin });
      return;
    }

    if (unregisterInstance) {
      unregisterInstance();
    }
    unregisterInstance = registerLiquidGlassController(instance, {
      id: 'specialist-card',
      host: firstSpecialistCard,
      experiment: experimentId,
      origin,
    });

    instance.onLowFps(({ fps }) => {
      setDisabledState('suspended', 'low-fps', { fps: Math.round(fps) });
      firstSpecialistCard.dataset.liquidFps = String(Math.round(fps));
    });

    emitLiquidGlassTelemetry({
      host: 'specialist-card',
      enabled: true,
      status: 'running',
      experiment: experimentId,
      preference: storedPreference || 'auto',
      eligibility: eligible,
      origin,
    });
  };

  const applyPreference = (origin = 'preference-change') => {
    if (storedPreference === 'disabled') {
      setDisabledState('disabled', 'preferencia-usuario', { origin });
    } else {
      activate(origin);
    }
  };

  const handlePreferenceEvent = (event) => {
    const detailPreference = normalizePreference(event?.detail?.preference);
    storedPreference =
      detailPreference ?? normalizePreference(getStoredLiquidGlassPreference()) ?? null;
    updatePreferenceDataset();
    applyPreference('preference-change');
  };

  const handleStorageEvent = (event) => {
    if (event.key !== LIQUID_GLASS_PREF_KEY) {
      return;
    }
    storedPreference = normalizePreference(event.newValue);
    updatePreferenceDataset();
    applyPreference('storage');
  };

  updatePreferenceDataset();
  updateEligibility();
  applyPreference('initial');

  window.addEventListener(LIQUID_GLASS_PREF_EVENT, handlePreferenceEvent);
  window.addEventListener('storage', handleStorageEvent);
}

function setupSlider() {
  if (!track) return;
  const slides = Array.from(track.children);
  let index = 0;
  const sliderEl = track.closest('.slider');
  let isPointerActive = false;

  const endPointerInteraction = () => {
    if (!isPointerActive) {
      return;
    }
    isPointerActive = false;
    resumeLiquidGlassControllers('slider-interaction');
    window.removeEventListener('pointerup', endPointerInteraction);
    window.removeEventListener('pointercancel', endPointerInteraction);
  };

  const startPointerInteraction = () => {
    if (isPointerActive) {
      return;
    }
    isPointerActive = true;
    pauseLiquidGlassControllers('slider-interaction');
    window.addEventListener('pointerup', endPointerInteraction);
    window.addEventListener('pointercancel', endPointerInteraction);
  };

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

  sliderEl?.addEventListener('pointerdown', startPointerInteraction, { passive: true });
  sliderEl?.addEventListener('pointerup', endPointerInteraction);
  sliderEl?.addEventListener('pointercancel', endPointerInteraction);
  sliderEl?.addEventListener('pointerleave', (event) => {
    if (!isPointerActive || event.buttons !== 0) {
      return;
    }
    endPointerInteraction();
  });

  window.addEventListener('resize', () => {
    index = Math.min(index, Math.max(0, slides.length - visibleSlides()));
    update();
  });

  update();
}

setupSlider();
setupHeroLiquidGlass();
setupSpecialistLiquidGlass();
