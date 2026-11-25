import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchWithRetryMock, fetchWithTimeoutMock } = vi.hoisted(() => ({
  fetchWithRetryMock: vi.fn(),
  fetchWithTimeoutMock: vi.fn(),
}));

vi.mock("@/lib/http", () => ({ fetchWithRetry: fetchWithRetryMock, fetchWithTimeout: fetchWithTimeoutMock }));

import { CupsCatalogPanel } from "@/app/portal/admin/cups/CupsCatalogPanel";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const LAURA = "22222222-2222-4222-8222-222222222222";

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

beforeEach(() => {
  vi.clearAllMocks();
  fetchWithRetryMock.mockResolvedValue(
    json({
      procedures: [{ cupsCode: "237301", serviceId: SERVICE_ID, professionalIds: [LAURA] }],
      services: [{ id: SERVICE_ID, name: "Endodoncia", active: true }],
      professionals: [{ id: LAURA, name: "Laura Gómez", specialty: "Endodoncia" }],
    }),
  );
});

describe("CupsCatalogPanel (DOG-42)", () => {
  it("muestra el total y el conteo por grupo de lo que ya presta la clínica", async () => {
    render(<CupsCatalogPanel />);
    expect(await screen.findByText("La clínica presta 1 de 177")).toBeTruthy();
    const endodoncia = screen.getByText("Endodoncia", { selector: "summary span" }).closest("summary")!;
    expect(within(endodoncia).getByText(/^1 de \d+$/)).toBeTruthy();
  });

  it("marcar un procedimiento lo guarda sin servicio y avisa que no se puede agendar", async () => {
    fetchWithTimeoutMock.mockResolvedValue(json({ procedure: {}, createdAssignments: [] }));
    render(<CupsCatalogPanel />);
    await screen.findByText("La clínica presta 1 de 177");

    fireEvent.click(screen.getByLabelText(/237302/));

    await waitFor(() => expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchWithTimeoutMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ cupsCode: "237302", offered: true, serviceId: null, professionalIds: [] });
    expect(screen.getAllByText("Sin servicio no se puede agendar.").length).toBeGreaterThan(0);
    expect(screen.getByText("La clínica presta 2 de 177")).toBeTruthy();
  });

  it("si el servidor rechaza el cambio, lo revierte y muestra el error", async () => {
    fetchWithTimeoutMock.mockResolvedValue(json({ error: "El servicio no existe." }, false));
    render(<CupsCatalogPanel />);
    await screen.findByText("La clínica presta 1 de 177");

    fireEvent.click(screen.getByLabelText(/237301/));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "El servicio no existe.");
    expect((screen.getByLabelText(/237301/) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("La clínica presta 1 de 177")).toBeTruthy();
  });

  it("filtra por código o por nombre sin importar tildes", async () => {
    render(<CupsCatalogPanel />);
    await screen.findByText("La clínica presta 1 de 177");

    fireEvent.change(screen.getByLabelText("Buscar por código o nombre"), { target: { value: "pulpotomia" } });

    expect(screen.getByLabelText(/237102/)).toBeTruthy();
    expect(screen.queryByLabelText(/237301/)).toBeNull();
  });
});
