import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { BookingFormSection } from "../BookingForm";
import type { AppointmentSummary } from "@/lib/api/types";
import { createAppointmentRequest } from "@/lib/api/appointments";

vi.mock("@/lib/api/appointments", () => ({
  createAppointmentRequest: vi.fn(),
}));

const mockAppointment: AppointmentSummary = {
  id: "appt-1",
  patientId: "unassigned",
  specialistId: "unassigned",
  service: "limpieza",
  scheduledAt: new Date().toISOString(),
  status: "pending",
};

function renderForm() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <BookingFormSection
        title="Agenda tu cita"
        description="Completa tus datos"
        selectLabel="Servicio"
        options={[{ value: "limpieza", label: "Limpieza" }]}
        benefitsTitle="Beneficios"
        benefits={[{ icon: "CalendarCheck", text: "Horarios flexibles" }]}
        scheduleNote="Lunes a sábado"
        consentNote="Acepto términos"
      />
    </QueryClientProvider>,
  );
}

describe("BookingFormSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("envía la solicitud y muestra mensaje de éxito", async () => {
    vi.mocked(createAppointmentRequest).mockResolvedValue(mockAppointment);
    renderForm();

    fireEvent.change(screen.getByLabelText(/Nombre completo/i), {
      target: { value: "Ana Test" },
    });
    fireEvent.change(screen.getByLabelText(/Celular/i), {
      target: { value: "3001234567" },
    });
    fireEvent.change(screen.getByLabelText(/Correo electrónico/i), {
      target: { value: "ana@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/Servicio/i), { target: { value: "limpieza" } });
    fireEvent.change(screen.getByLabelText(/Fecha preferida/i), { target: { value: "2025-01-01" } });

    fireEvent.submit(screen.getByRole("form", { name: /agendamiento/i }));

    await waitFor(() => {
      expect(screen.getByText(/¡Gracias! Te contactaremos muy pronto./i)).toBeTruthy();
    });

    expect((screen.getByLabelText(/Nombre completo/i) as HTMLInputElement).value).toBe("");
  });

  it("muestra mensaje de error cuando la API falla", async () => {
    vi.mocked(createAppointmentRequest).mockRejectedValue({ status: 400, message: "Datos incompletos" });
    renderForm();

    fireEvent.change(screen.getByLabelText(/Nombre completo/i), {
      target: { value: "Ana Test" },
    });
    fireEvent.change(screen.getByLabelText(/Celular/i), {
      target: { value: "3001234567" },
    });
    fireEvent.change(screen.getByLabelText(/Servicio/i), { target: { value: "limpieza" } });

    fireEvent.submit(screen.getByRole("form", { name: /agendamiento/i }));

    await waitFor(() => {
      expect(screen.getByText(/Datos incompletos/i)).toBeTruthy();
    });
  });
});
