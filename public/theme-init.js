(function () {
  var root = document.documentElement;
  var storageKey = "theme";

  function applyTheme(theme, persist) {
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    try {
      if (persist) {
        window.localStorage.setItem(storageKey, theme);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch (_) {}
  }

  function getStoredTheme() {
    try {
      var stored = window.localStorage.getItem(storageKey);
      return stored === "dark" || stored === "light" ? stored : null;
    } catch (_) {
      return null;
    }
  }

  var mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var getSystemTheme = function () { return mediaQuery && mediaQuery.matches ? "dark" : "light"; };

  var storedTheme = getStoredTheme();
  applyTheme(storedTheme || getSystemTheme(), Boolean(storedTheme));

  function applyMediaChange(event) {
    if (getStoredTheme()) return;
    applyTheme(event.matches ? "dark" : "light", false);
  }

  if (mediaQuery) {
    var add = mediaQuery.addEventListener ? "addEventListener" : "addListener";
    mediaQuery[add]("change", applyMediaChange);
  }
})();
