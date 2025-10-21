"use client";

import { useEffect, useState } from "react";

function getStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem("dentpro-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    window.localStorage.setItem("dentpro-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      id="darkModeToggle"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      onClick={toggle}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-rail">
          <span className="glass-filter" aria-hidden="true"></span>
          <span className="glass-overlay" aria-hidden="true"></span>
          <span className="glass-specular" aria-hidden="true"></span>
          <span className="theme-toggle-icon" data-theme-icon="sun" aria-hidden="true">
            light_mode
          </span>
          <span className="theme-toggle-icon" data-theme-icon="moon" aria-hidden="true">
            dark_mode
          </span>
        </span>
        <span className="theme-toggle-thumb">
          <span className="glass-filter" aria-hidden="true"></span>
          <span className="glass-overlay" aria-hidden="true"></span>
          <span className="glass-specular" aria-hidden="true"></span>
        </span>
      </span>
    </button>
  );
}

