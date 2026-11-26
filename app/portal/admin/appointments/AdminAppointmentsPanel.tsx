"use client";

import { useEffect, useState } from "react";

import { AppointmentsList } from "@/app/portal/components/AppointmentsList";
import { fetchWithRetry } from "@/lib/http";
import { SkeletonRows } from "@/app/portal/components/ui/Skeleton";

type AppointmentItem = Parameters<typeof AppointmentsList>[0]["initialAppointments"][number];

export function AdminAppointmentsPanel() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/appointments?pageSize=50");

    if (response.ok) {
      const data = (await response.json()) as { data: AppointmentItem[] };
      setAppointments(data.data ?? []);
    } else {
      setError("No pudimos cargar las citas.");
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  if (loading) {
    return <SkeletonRows label="Cargando citas" />;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  return <AppointmentsList initialAppointments={appointments} role="ADMINISTRADOR" />;
}
