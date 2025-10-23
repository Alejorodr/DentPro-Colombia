import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("toggles the theme and updates the accessible label", async () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Activar modo oscuro" });
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await userEvent.click(button);

    expect(button.getAttribute("aria-label")).toBe("Activar modo claro");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe("dark");

    await userEvent.click(button);

    expect(button.getAttribute("aria-label")).toBe("Activar modo oscuro");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("theme")).toBe("light");
  });
});
