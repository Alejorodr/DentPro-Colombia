import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { BookingFormSection } from "./BookingForm";

vi.mock("@/hooks/useBookingForm", () => ({
  useBookingForm: () => ({
    handleSubmit: vi.fn(),
    isSuccess: false,
    isPending: false,
    error: null,
  }),
}));

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
  it("renders a single email field and a primary booking CTA", () => {
    render(<BookingFormSection {...props} />);

    expect(screen.getAllByLabelText("Correo electrónico")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Reservar turno ahora/i }).getAttribute("href")).toBe("/appointments/new");
  });
});
