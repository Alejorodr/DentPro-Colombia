import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { AppointmentsTable } from "../AppointmentsTable";
import type { AppointmentSummary } from "@/lib/api/types";

const originalFetch = global.fetch;

const baseAppointment: AppointmentSummary = {
  id: "appt-1",
  patientId: "Paciente Uno",
  specialistId: "Especialista",
  service: "Limpieza",
  scheduledAt: new Date().toISOString(),
  status: "pending",
};

describe("AppointmentsTable", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  it("muestra estado vacío cuando no hay citas", () => {
    render(<AppointmentsTable appointments={[]} />);

    expect(screen.getByText(/No hay citas registradas aún/i)).toBeTruthy();
  });

  it("actualiza el estado al confirmar una cita", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ...baseAppointment,
          status: "confirmed",
        }),
        { status: 200 },
      ) as Response,
    );

    render(<AppointmentsTable appointments={[baseAppointment]} />);

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Confirmada/i)).toBeTruthy();
    });
  });
});
