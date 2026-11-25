import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { COOKIE_CONSENT_STORAGE_KEY, openCookiePreferences, parseCookieConsent } from "@/lib/privacy/cookie-consent";

import { ConsentedMapEmbed } from "../ConsentedMapEmbed";
import { CookieConsent } from "../CookieConsent";

const pathnameMock = vi.hoisted(() => vi.fn(() => "/"));
vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));

function storedConsent() {
  return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

beforeAll(() => {
  // jsdom no implementa <dialog>.showModal()/close().
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  pathnameMock.mockReturnValue("/");
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("CookieConsent", () => {
  it("muestra el aviso cuando no hay decisión guardada", () => {
    render(<CookieConsent />);
    expect(screen.getByRole("region", { name: "Tu privacidad" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Política de cookies" }).getAttribute("href")).toBe("/politica-de-tratamiento-de-datos#cookies");
  });

  it("'Aceptar todo' guarda terceros = true y oculta el aviso", async () => {
    render(<CookieConsent />);
    await userEvent.click(screen.getByRole("button", { name: "Aceptar todo" }));

    expect(storedConsent()?.thirdParty).toBe(true);
    expect(screen.queryByRole("region", { name: "Tu privacidad" })).toBeNull();
  });

  it("'Solo esenciales' rechaza con un solo clic", async () => {
    render(<CookieConsent />);
    await userEvent.click(screen.getByRole("button", { name: "Solo esenciales" }));

    expect(storedConsent()?.thirdParty).toBe(false);
    expect(screen.queryByRole("region", { name: "Tu privacidad" })).toBeNull();
  });

  it("'Personalizar' abre el panel y guarda la elección del interruptor", async () => {
    render(<CookieConsent />);
    await userEvent.click(screen.getByRole("button", { name: "Personalizar" }));

    const toggle = screen.getByRole("switch", { name: "Servicios de terceros" });
    expect((toggle as HTMLInputElement).checked).toBe(false);
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { name: "Guardar preferencias" }));

    expect(storedConsent()?.thirdParty).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("no muestra el aviso si ya hay decisión, pero el footer puede reabrir el panel", async () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: 1, thirdParty: true, updatedAt: "2026-11-25T12:00:00.000Z" }),
    );
    render(<CookieConsent />);
    expect(screen.queryByRole("region", { name: "Tu privacidad" })).toBeNull();

    act(() => openCookiePreferences());
    expect((screen.getByRole("switch", { name: "Servicios de terceros" }) as HTMLInputElement).checked).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("no muestra el aviso dentro del portal", () => {
    pathnameMock.mockReturnValue("/portal/client");
    render(<CookieConsent />);
    expect(screen.queryByRole("region", { name: "Tu privacidad" })).toBeNull();
  });
});

describe("ConsentedMapEmbed", () => {
  const props = {
    src: "https://www.google.com/maps/embed?pb=test",
    title: "Ubicación DentPro Colombia",
    directionsHref: "https://www.google.com/maps/search/?api=1&query=DentPro",
  };

  it("sin consentimiento muestra la fachada, no el iframe de Google", () => {
    render(<ConsentedMapEmbed {...props} />);
    expect(screen.queryByTitle(props.title)).toBeNull();
    expect(screen.getByRole("button", { name: "Cargar mapa" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Abrir en Google Maps" }).getAttribute("href")).toBe(props.directionsHref);
  });

  it("'Cargar mapa' lo carga solo para esta visita si no se pide recordar", async () => {
    render(<ConsentedMapEmbed {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Cargar mapa" }));

    expect(screen.getByTitle(props.title).getAttribute("src")).toBe(props.src);
    expect(storedConsent()).toBeNull();
  });

  it("'Recordar mi elección' guarda el consentimiento de terceros", async () => {
    render(<ConsentedMapEmbed {...props} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Recordar mi elección" }));
    await userEvent.click(screen.getByRole("button", { name: "Cargar mapa" }));

    expect(storedConsent()?.thirdParty).toBe(true);
  });

  it("se carga directo si ya se aceptaron los servicios de terceros", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: 1, thirdParty: true, updatedAt: "2026-11-25T12:00:00.000Z" }),
    );
    render(<ConsentedMapEmbed {...props} />);
    expect(screen.getByTitle(props.title)).toBeTruthy();
  });
});
