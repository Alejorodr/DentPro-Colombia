const year = document.getElementById("year"); if (year) year.textContent = new Date().getFullYear();
const root = document.documentElement;
const themeStorageKey = "dentpro-theme";
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)");
const darkToggle = document.getElementById("darkModeToggle");

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch (_error) {
    /* ignore storage errors */
  }
  return null;
}

function persistTheme(theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch (_error) {
    /* ignore storage errors */
  }
}

function updateToggleState(isDark) {
  if (!darkToggle) return;
  const lightLabel = darkToggle.dataset?.labelLight || "Activar modo oscuro";
  const darkLabel = darkToggle.dataset?.labelDark || "Activar modo claro";
  const label = isDark ? darkLabel : lightLabel;
  darkToggle.setAttribute("role", "switch");
  darkToggle.setAttribute("aria-checked", String(isDark));
  darkToggle.setAttribute("aria-label", label);
  darkToggle.setAttribute("title", label);
}

function applyTheme(theme, shouldPersist = false) {
  const isDark = theme === "dark";
  root.classList.toggle("dark", isDark);
  updateToggleState(isDark);
  if (shouldPersist) {
    persistTheme(theme);
  }
}

function resolveInitialTheme() {
  const stored = getStoredTheme();
  if (stored) return stored;
  return prefersDark?.matches ? "dark" : "light";
}

const initialTheme = resolveInitialTheme();
applyTheme(initialTheme);

prefersDark?.addEventListener("change", (event) => {
  if (getStoredTheme()) return;
  applyTheme(event.matches ? "dark" : "light");
});

if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    const nextTheme = root.classList.contains("dark") ? "light" : "dark";
    applyTheme(nextTheme, true);
  });
}
(function(){
  const track = document.getElementById("specialistsTrack"); if (!track) return;
  let idx = 0;
  const cards = track.querySelectorAll(".card"); if (!cards.length) return;
  const dots = Array.from(document.querySelectorAll(".dot"));
  function go(i){ idx = (i+cards.length)%cards.length; track.style.transform = `translateX(${-idx*(cards[0].clientWidth+16)}px)`; dots.forEach((d,j)=>d.classList.toggle("active", j===idx)); }
  document.getElementById("prevSpec")?.addEventListener("click",()=>go(idx-1));
  document.getElementById("nextSpec")?.addEventListener("click",()=>go(idx+1));
  go(0);
})();
document.getElementById("bookingForm")?.addEventListener("submit", (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  alert(`Turno solicitado para ${data.name || "paciente"} — ${data.date || ""} ${data.time || ""}`);
});
