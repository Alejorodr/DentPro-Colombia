import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BookingFormSection } from "../BookingForm";
import { fetchWithRetry } from "@/lib/http";

vi.mock("@/lib/http", () => ({
  fetchWithRetry: vi.fn(),
}));

function renderSection() {
  return render(
    <BookingFormSection
      title="Agenda tu cita"
      description="Confirmación inmediata"
      selectLabel="Servicio"
      options={[{ value: "limpieza", label: "Limpieza" }]}
      benefitsTitle="Beneficios"
      benefits={[{ icon: "CalendarCheck", text: "Horarios flexibles" }]}
      scheduleNote="Lunes a sábado"
      consentNote="Acepto términos"
    />,
  );
}

describe("BookingFormSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra los turnos disponibles obtenidos de la API", async () => {
    vi.mocked(fetchWithRetry).mockResolvedValue({
      ok: true,
      json: async () => ({
        slots: [
          { startsAt: "2026-08-20T14:00:00.000Z", professional: "Dra. Pérez", specialty: "Limpieza" },
        ],
      }),
    } as Response);

    renderSection();

    await waitFor(() => {
      expect(screen.getByText(/Limpieza/i)).toBeTruthy();
      expect(screen.getByText(/Dra\. Pérez/i)).toBeTruthy();
    });

    expect(screen.getByRole("link", { name: /Ver disponibilidad y reservar/i }).getAttribute("href")).toBe(
      "/appointments/new",
    );
  });

  it("muestra turnos orientativos cuando la API falla", async () => {
    vi.mocked(fetchWithRetry).mockRejectedValue(new Error("network error"));

    renderSection();

    await waitFor(() => {
      expect(
        screen.getByText(/Mostrando horarios orientativos mientras actualizamos la agenda en línea\./i),
      ).toBeTruthy();
    });

    expect(screen.getByText(/Disponibilidad orientativa/i)).toBeTruthy();
  });
});
