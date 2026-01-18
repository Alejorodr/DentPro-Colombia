"use client";

import { useEffect, useMemo, useState } from "react";

import { AppointmentsList } from "@/app/portal/components/AppointmentsList";

type AppointmentItem = Parameters<typeof AppointmentsList>[0]["initialAppointments"][number];

type Specialty = {
  id: string;
  name: string;
};

type Professional = {
  id: string;
  user: { name: string; lastName: string };
  specialty: Specialty;
};

export function ReceptionistPanel() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("");
  const [patientForm, setPatientForm] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    documentId: "",
  });
  const [savingPatient, setSavingPatient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [appointmentsResponse, specialtiesResponse, professionalsResponse] = await Promise.all([
      fetch("/api/appointments?pageSize=50"),
      fetch("/api/specialties"),
      fetch("/api/professionals?pageSize=50"),
    ]);

    if (appointmentsResponse.ok) {
      const data = (await appointmentsResponse.json()) as { data: AppointmentItem[] };
      setAppointments(data.data ?? []);
    }

    if (specialtiesResponse.ok) {
      const data = (await specialtiesResponse.json()) as Specialty[];
      setSpecialties(data);
    }

    if (professionalsResponse.ok) {
      const data = (await professionalsResponse.json()) as { data: Professional[] };
      setProfessionals(data.data ?? []);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesProfessional = filterProfessional
        ? appointment.professional?.id === filterProfessional
        : true;
      const matchesSpecialty = filterSpecialty
        ? appointment.professional?.specialty?.id === filterSpecialty
        : true;
      return matchesProfessional && matchesSpecialty;
    });
  }, [appointments, filterProfessional, filterSpecialty]);

  const createPatient = async () => {
    if (!patientForm.name || !patientForm.lastName || !patientForm.email || !patientForm.password) {
      setError("Completa nombre, apellido, correo y contraseña.");
      return;
    }

    setSavingPatient(true);
    setError(null);
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: patientForm.name,
        lastName: patientForm.lastName,
        email: patientForm.email,
        password: patientForm.password,
        role: "PACIENTE",
        phone: patientForm.phone,
        documentId: patientForm.documentId,
      }),
    });

    if (response.ok) {
      setPatientForm({
        name: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        documentId: "",
      });
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos crear el paciente.");
    }

    setSavingPatient(false);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-slate-900">Crear paciente</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            className="input h-11 text-sm"
            placeholder="Nombre"
            value={patientForm.name}
            onChange={(event) => setPatientForm((prev) => ({ ...prev, name: event.target.value }))}
            disabled={savingPatient}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Apellido"
            value={patientForm.lastName}
            onChange={(event) => setPatientForm((prev) => ({ ...prev, lastName: event.target.value }))}
            disabled={savingPatient}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Correo"
            value={patientForm.email}
            onChange={(event) => setPatientForm((prev) => ({ ...prev, email: event.target.value }))}
            disabled={savingPatient}
          />
          <input
            className="input h-11 text-sm"
            type="password"
            placeholder="Contraseña"
            value={patientForm.password}
            onChange={(event) => setPatientForm((prev) => ({ ...prev, password: event.target.value }))}
            disabled={savingPatient}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Teléfono"
            value={patientForm.phone}
            onChange={(event) => setPatientForm((prev) => ({ ...prev, phone: event.target.value }))}
            disabled={savingPatient}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Documento"
            value={patientForm.documentId}
            onChange={(event) => setPatientForm((prev) => ({ ...prev, documentId: event.target.value }))}
            disabled={savingPatient}
          />
        </div>
        <button
          type="button"
          className="mt-4 rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          onClick={createPatient}
          disabled={savingPatient}
        >
          Crear paciente
        </button>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Citas unificadas</h2>
            <p className="text-sm text-slate-600">Filtra por profesional o especialidad.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="input h-10 text-xs"
              value={filterSpecialty}
              onChange={(event) => setFilterSpecialty(event.target.value)}
            >
              <option value="">Todas las especialidades</option>
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </option>
              ))}
            </select>
            <select
              className="input h-10 text-xs"
              value={filterProfessional}
              onChange={(event) => setFilterProfessional(event.target.value)}
            >
              <option value="">Todos los profesionales</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.user.name} {professional.user.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <AppointmentsList
            key={`${filterSpecialty}-${filterProfessional}`}
            initialAppointments={filteredAppointments}
            role="RECEPCIONISTA"
          />
        </div>
      </section>
    </div>
  );
}
