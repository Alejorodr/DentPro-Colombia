import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { BookingFormSection } from "./BookingForm";

const props = {
  title: "Agenda",
  description: "Reserva tu cita",
  selectLabel: "Servicio",
  options: [
    { value: "limpieza", label: "Limpieza" },
    { value: "ortodoncia", label: "Ortodoncia" },
  ],
  benefitsTitle: "Beneficios",
  benefits: [{ icon: "CalendarCheck" as const, text: "Recordatorios" }],
  scheduleNote: "Lun-Sáb",
  consentNote: "Autorizo datos",
};

describe("BookingFormSection", () => {
  it("renders the primary booking CTA linking to /appointments/new", () => {
    render(<BookingFormSection {...props} />);

    const cta = screen.getByRole("link", { name: /ver disponibilidad y reservar/i });
    expect(cta.getAttribute("href")).toBe("/appointments/new");
  });

  it("does not render a contact form", () => {
    render(<BookingFormSection {...props} />);

    expect(screen.queryByRole("form")).toBeNull();
  });
});
