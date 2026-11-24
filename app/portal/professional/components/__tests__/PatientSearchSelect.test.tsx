import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PatientSearchSelect, type PatientOption } from "../PatientSearchSelect";
import { fetchWithRetry } from "@/lib/http";

vi.mock("@/lib/http", () => ({ fetchWithRetry: vi.fn() }));

const ANA: PatientOption = { id: "p-1", name: "Ana", lastName: "Gómez", patientCode: "PAC-001" };
const LUIS: PatientOption = { id: "p-2", name: "Luis", lastName: "Rojas", patientCode: null };

function respondWith(patients: PatientOption[]) {
  vi.mocked(fetchWithRetry).mockResolvedValue({ ok: true, json: async () => ({ data: patients }) } as Response);
}

function Harness({ onChange }: { onChange?: (patient: PatientOption | null) => void }) {
  const [value, setValue] = useState<PatientOption | null>(null);
  return (
    <PatientSearchSelect
      value={value}
      onChange={(patient) => {
        setValue(patient);
        onChange?.(patient);
      }}
    />
  );
}

describe("PatientSearchSelect", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("busca en el servidor con lo escrito, no en una lista de 50 cargada al inicio", async () => {
    respondWith([ANA]);
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole("combobox", { name: "Buscar paciente" }), "ana");

    await waitFor(() =>
      expect(vi.mocked(fetchWithRetry).mock.calls.map(([url]) => String(url))).toContain(
        "/api/professional/patients?pageSize=10&q=ana",
      ),
    );
    expect(await screen.findByRole("option", { name: /Ana Gómez/ })).toBeTruthy();
  });

  it("selecciona con el teclado y permite quitar la selección", async () => {
    respondWith([ANA, LUIS]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    const input = screen.getByRole("combobox", { name: "Buscar paciente" });
    await user.click(input);
    await screen.findByRole("option", { name: /Luis Rojas/ });
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(LUIS);
    expect(screen.getByText("Luis Rojas")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Quitar" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("combobox", { name: "Buscar paciente" })).toBeTruthy();
  });

  it("avisa cuando no hay coincidencias", async () => {
    respondWith([]);
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole("combobox", { name: "Buscar paciente" }), "zzz");
    expect(await screen.findByText("Ningún paciente coincide con la búsqueda.")).toBeTruthy();
  });

  it("muestra un error si la búsqueda falla", async () => {
    vi.mocked(fetchWithRetry).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox", { name: "Buscar paciente" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
