"use client";

import { useEffect, useState } from "react";

import { AppointmentsList } from "@/app/portal/components/AppointmentsList";

type AppointmentItem = Parameters<typeof AppointmentsList>[0]["initialAppointments"][number];

export function ProfessionalAppointments() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/appointments");

    if (response.ok) {
      const data = (await response.json()) as AppointmentItem[];
      setAppointments(data);
    } else {
      setError("No pudimos cargar las citas.");
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando citas...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return <AppointmentsList initialAppointments={appointments} role="PROFESIONAL" />;
}
