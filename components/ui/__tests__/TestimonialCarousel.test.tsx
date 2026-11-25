import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  // Sin animaciones: el cambio de tarjeta es inmediato y el test no depende de timers.
  return { ...actual, useReducedMotion: () => true };
});

import { TestimonialCarousel, type Testimonial } from "@/components/ui/TestimonialCarousel";

const testimonials: Testimonial[] = [
  { id: "a", name: "Laura Gómez", text: "Excelente atención.", rating: 5, meta: "hace 2 semanas" },
  { id: "b", name: "Andrés Pérez", text: "Muy profesionales.", rating: 4 },
  { id: "c", name: "Camila Rojas", text: "Mucha paciencia con mi hija." },
];

function currentName() {
  const article = screen.getAllByRole("article", { hidden: true }).find((el) => el.getAttribute("aria-hidden") === "false");
  return article?.querySelector("p, a")?.textContent;
}

describe("TestimonialCarousel", () => {
  it("muestra la primera reseña con sus estrellas", () => {
    render(<TestimonialCarousel testimonials={testimonials} autoPlayMs={0} />);
    expect(currentName()).toBe("Laura Gómez");
    expect(screen.getAllByRole("img", { name: "Calificación: 5 de 5 estrellas" }).length).toBeGreaterThan(0);
  });

  it("avanza y retrocede con los botones y da la vuelta", () => {
    render(<TestimonialCarousel testimonials={testimonials} autoPlayMs={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Reseña siguiente" }));
    expect(currentName()).toBe("Andrés Pérez");
    fireEvent.click(screen.getByRole("button", { name: "Reseña anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Reseña anterior" }));
    expect(currentName()).toBe("Camila Rojas");
  });

  it("se maneja con las flechas del teclado y con los puntos", () => {
    render(<TestimonialCarousel testimonials={testimonials} autoPlayMs={0} />);
    const region = screen.getByRole("region", { name: "Reseñas de pacientes" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(currentName()).toBe("Andrés Pérez");
    fireEvent.click(screen.getByRole("button", { name: "Ver reseña 3 de 3" }));
    expect(currentName()).toBe("Camila Rojas");
  });

  it("con una sola reseña no muestra controles", () => {
    render(<TestimonialCarousel testimonials={[testimonials[0]]} />);
    expect(screen.queryByRole("button", { name: "Reseña siguiente" })).toBeNull();
  });
});
