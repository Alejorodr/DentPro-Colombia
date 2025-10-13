const html = document.documentElement;
const storageKey = 'dentpro-theme';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const toggleButtons = new Set();

// Maneja el acceso a localStorage y permite una degradación silenciosa cuando no está disponible.
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

// Recupera el tema almacenado validando que sea un valor reconocido.
function getStoredTheme() {
  const stored = safeLocalStorage('get');
  return stored === 'dark' || stored === 'light' ? stored : null;
}

// Sincroniza los toggles registrados con el estado actual y mantiene etiquetas accesibles.
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

// Aplica la clase y atributos que consumen los estilos del tema.
function applyTheme(theme) {
  const isDark = theme === 'dark';
  html.classList.toggle('dark', isDark);
  html.dataset.theme = isDark ? 'dark' : 'light';
  updateToggleState(isDark);
}

// Determina el tema inicial priorizando la preferencia guardada y luego la del sistema.
function resolvePreferredTheme() {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }
  return prefersDark.matches ? 'dark' : 'light';
}

// Persiste el tema elegido solo cuando el almacenamiento está disponible.
function persistTheme(theme) {
  safeLocalStorage('set', theme);
}

// Centraliza la aplicación del tema y su persistencia opcional.
function setTheme(theme, persist = false) {
  applyTheme(theme);
  if (persist) {
    persistTheme(theme);
  }
}

// Alterna entre modos claro y oscuro, actualizando también la preferencia almacenada.
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

// Registra un botón de cambio de tema y garantiza que comunique su estado vía ARIA.
export function registerThemeToggle(button) {
  if (!button) return;
  toggleButtons.add(button);
  button.addEventListener('click', () => toggleTheme());
  updateToggleState(html.classList.contains('dark'));
}

// Expone el tema actual para otros módulos que necesiten reaccionar a él.
export function getCurrentTheme() {
  return html.classList.contains('dark') ? 'dark' : 'light';
}
