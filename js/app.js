const html = document.documentElement;
const storageKey = 'dentpro-theme';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const toggleButtons = new Set();

function safeLocalStorage(action, value) {
  try {
    if (action === 'get') {
      return localStorage.getItem(storageKey);
    }
    if (action === 'set') {
      localStorage.setItem(storageKey, value);
    }
    if (action === 'remove') {
      localStorage.removeItem(storageKey);
    }
  } catch (_) {
    // localStorage might be unavailable (private mode, etc.)
  }
  return null;
}

function getStoredTheme() {
  const stored = safeLocalStorage('get');
  return stored === 'dark' || stored === 'light' ? stored : null;
}

function updateToggleState(isDark) {
  toggleButtons.forEach((button) => {
    const state = String(isDark);
    button.setAttribute('aria-checked', state);
    button.removeAttribute('aria-pressed');
    button.classList.toggle('theme-toggle--dark', isDark);
    button.classList.toggle('theme-toggle--light', !isDark);
    const lightLabel = button.dataset.labelLight || 'Activar modo oscuro';
    const darkLabel = button.dataset.labelDark || 'Activar modo claro';
    button.setAttribute('aria-label', isDark ? darkLabel : lightLabel);
  });
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  html.classList.toggle('dark', isDark);
  html.dataset.theme = isDark ? 'dark' : 'light';
  updateToggleState(isDark);
}

function resolvePreferredTheme() {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }
  return prefersDark.matches ? 'dark' : 'light';
}

function persistTheme(theme) {
  safeLocalStorage('set', theme);
}

function setTheme(theme, persist = false) {
  applyTheme(theme);
  if (persist) {
    persistTheme(theme);
  }
}

function toggleTheme() {
  const nextTheme = html.classList.contains('dark') ? 'light' : 'dark';
  setTheme(nextTheme, true);
}

prefersDark.addEventListener('change', (event) => {
  if (getStoredTheme()) {
    return;
  }
  setTheme(event.matches ? 'dark' : 'light');
});

setTheme(resolvePreferredTheme());

export function registerThemeToggle(button) {
  if (!button) return;
  toggleButtons.add(button);
  button.addEventListener('click', () => toggleTheme());
  updateToggleState(html.classList.contains('dark'));
}

export function getCurrentTheme() {
  return html.classList.contains('dark') ? 'dark' : 'light';
}
