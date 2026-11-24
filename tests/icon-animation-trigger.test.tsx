import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Baby, Bell, MorphToggleIcon } from "@/components/ui/Icon";

type ListenerSpy = { mock: { calls: unknown[][]; contexts: unknown[] } };

function pointerEnterTargets(spy: ListenerSpy) {
  return spy.mock.calls
    .map((call, index) => ({ type: call[0], target: spy.mock.contexts[index] as Element }))
    .filter((entry) => entry.type === "pointerenter")
    .map((entry) => entry.target);
}

describe("disparo de la animación de los iconos", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("anima el icono al pasar sobre el botón que lo contiene, no solo sobre el icono", () => {
    const spy = vi.spyOn(HTMLElement.prototype, "addEventListener");
    const { getByRole } = render(
      <button type="button">
        <Bell aria-hidden="true" />
        Notificaciones
      </button>,
    );

    expect(pointerEnterTargets(spy)).toContain(getByRole("button"));
  });

  it("usa la tarjeta .group como disparador de los iconos estáticos", () => {
    const spy = vi.spyOn(HTMLElement.prototype, "addEventListener");
    const { getByTestId } = render(
      <article className="group" data-testid="card">
        <Baby aria-hidden="true" />
      </article>,
    );

    expect(pointerEnterTargets(spy)).toContain(getByTestId("card"));
  });

  it("sin contenedor interactivo, el icono se dispara a sí mismo", () => {
    const spy = vi.spyOn(HTMLElement.prototype, "addEventListener");
    const { container } = render(
      <div>
        <Bell aria-hidden="true" />
      </div>,
    );

    const targets = pointerEnterTargets(spy);
    expect(targets).toHaveLength(1);
    expect(container.firstElementChild?.contains(targets[0])).toBe(true);
    expect(targets[0]).not.toBe(container.firstElementChild);
  });

  it("no registra disparadores con isAnimated={false}", () => {
    const spy = vi.spyOn(HTMLElement.prototype, "addEventListener");
    render(
      <button type="button">
        <Bell aria-hidden="true" isAnimated={false} />
      </button>,
    );

    expect(pointerEnterTargets(spy)).toHaveLength(0);
  });
});

describe("MorphToggleIcon", () => {
  it("dibuja un icono distinto para cada estado del par", () => {
    const off = render(<MorphToggleIcon name="menu" active={false} aria-hidden="true" />);
    const offPath = off.container.querySelector("path")?.getAttribute("d");
    off.unmount();

    const on = render(<MorphToggleIcon name="menu" active aria-hidden="true" />);
    const onPath = on.container.querySelector("path")?.getAttribute("d");

    expect(offPath).toBeTruthy();
    expect(onPath).toBeTruthy();
    expect(onPath).not.toBe(offPath);
  });

  it("queda oculto para lectores de pantalla cuando el botón ya tiene etiqueta", () => {
    const { container } = render(<MorphToggleIcon name="theme" active={false} />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
