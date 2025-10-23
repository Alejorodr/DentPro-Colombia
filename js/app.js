/**
 * Módulo central encargado de coordinar el tema visual de la aplicación.
 * Gestiona la sincronización entre los estilos de Tailwind, los componentes
 * interactivos que alternan el modo de color y otros scripts que necesitan
 * conocer el estado del tema. Implementa degradaciones silenciosas para entornos
 * sin `localStorage` y respeta la preferencia del sistema cuando no hay datos
 * persistidos.
 */
const html = document.documentElement;
const storageKey = 'theme';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const toggleButtons = new Set();

/**
 * Gestiona el acceso seguro a `localStorage`, aplicando degradación silenciosa
 * cuando la API no está disponible o lanza errores (p. ej. modo incógnito).
 *
 * @param {'get'|'set'|'remove'} action Acción a ejecutar sobre el almacenamiento.
 * @param {string} [value] Valor a guardar cuando la acción es `set`.
 * @returns {string|null} Valor almacenado o `null` cuando la operación no es posible.
 */
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

/**
 * Obtiene y valida el tema guardado, descartando valores corruptos o
 * desconocidos.
 *
 * @returns {'dark'|'light'|null} Tema almacenado válido o `null` si no existe.
 */
function getStoredTheme() {
  const stored = safeLocalStorage('get');
  return stored === 'dark' || stored === 'light' ? stored : null;
}

/**
 * Sincroniza los controles de interfaz registrados para reflejar el estado del
 * tema actual, actualizando clases y atributos accesibles.
 *
 * @param {boolean} isDark Indica si el modo oscuro está activo.
 * @returns {void}
 */
function updateToggleState(isDark) {
  toggleButtons.forEach((button) => {
    const state = String(isDark);
    button.setAttribute('aria-checked', state);
    button.removeAttribute('aria-pressed');
    const lightLabel = button.dataset.labelLight || 'Activar modo oscuro';
    const darkLabel = button.dataset.labelDark || 'Activar modo claro';
    button.setAttribute('aria-label', isDark ? darkLabel : lightLabel);
  });
}

/**
 * Aplica el tema indicado al elemento raíz y comunica el cambio a los toggles
 * registrados.
 *
 * @param {'dark'|'light'} theme Tema que debe activarse.
 * @returns {void}
 */
function applyTheme(theme) {
  const isDark = theme === 'dark';
  html.classList.toggle('dark', isDark);
  html.dataset.theme = isDark ? 'dark' : 'light';
  updateToggleState(isDark);
}

/**
 * Determina el tema preferido priorizando la configuración guardada. Cuando no
 * hay datos válidos recurre a la preferencia del sistema operativo.
 *
 * @returns {'dark'|'light'} Tema que debe aplicarse inicialmente.
 */
function resolvePreferredTheme() {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }
  return prefersDark.matches ? 'dark' : 'light';
}

/**
 * Intenta persistir el tema elegido en `localStorage`. Si la operación falla
 * el error se omite para mantener la experiencia sin interrupciones.
 *
 * @param {'dark'|'light'} theme Tema que debe guardarse.
 * @returns {void}
 */
function persistTheme(theme) {
  safeLocalStorage('set', theme);
}

/**
 * Aplica el tema indicado y opcionalmente lo guarda para futuras visitas.
 * Cuando `persist` es falso la función funciona de manera efímera, útil en
 * contextos donde `localStorage` no está disponible.
 *
 * @param {'dark'|'light'} theme Tema que se debe aplicar.
 * @param {boolean} [persist=false] Define si el tema se persiste.
 * @returns {void}
 */
function setTheme(theme, persist = false) {
  applyTheme(theme);
  if (persist) {
    persistTheme(theme);
  }
}

/**
 * Alterna entre modo claro y oscuro, persistiendo la decisión del usuario cuando
 * es posible. Si `localStorage` falla la UI sigue actualizándose gracias a la
 * degradación implementada en `setTheme`.
 *
 * @returns {void}
 */
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

/**
 * Registra un botón alternador de tema, actualizando su estado ARIA y
 * manteniéndolo sincronizado con los cambios globales.
 *
 * @param {HTMLButtonElement} button Botón que activa el cambio de tema.
 * @returns {void}
 */
export function registerThemeToggle(button) {
  if (!button) return;
  toggleButtons.add(button);
  button.addEventListener('click', () => toggleTheme());
  updateToggleState(html.classList.contains('dark'));
}

/**
 * Expone el tema activo para que otros módulos puedan reaccionar sin acceder
 * directamente al DOM.
 *
 * @returns {'dark'|'light'} Tema actualmente aplicado.
 */
export function getCurrentTheme() {
  return html.classList.contains('dark') ? 'dark' : 'light';
}
