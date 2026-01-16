"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
};

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  professional: {
    user: { name: string; lastName: string };
    specialty: { name: string };
  };
};

type DashboardClinic = {
  name: string;
  city: string;
  address: string;
};

type DashboardResponse = {
  clinic: DashboardClinic;
};

type UserProfile = {
  name: string;
  lastName: string;
  email: string;
  patient?: { phone?: string | null; documentId?: string | null } | null;
};

const formatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function buildDateOptions(days = 7) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
}

export function ClientBookingForm() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [clinic, setClinic] = useState<DashboardClinic | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [patientDetails, setPatientDetails] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    documentId: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetch("/api/services?active=true&pageSize=50")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { data?: Service[] }) => setServices(data.data ?? []))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    void fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UserProfile | null) => {
        if (!data) {
          return;
        }
        setPatientDetails({
          name: data.name ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          phone: data.patient?.phone ?? "",
          documentId: data.patient?.documentId ?? "",
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void fetch("/api/client/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DashboardResponse | null) => {
        if (data?.clinic) {
          setClinic(data.clinic);
        }
      })
      .catch(() => setClinic(null));
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const query = new URLSearchParams();
    if (selectedServiceId) {
      query.set("serviceId", selectedServiceId);
    }
    query.set("date", selectedDate);

    void fetch(`/api/slots?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { slots?: Slot[] } | null) => {
        setSlots(data?.slots ?? []);
      })
      .catch(() => setSlots([]));
  }, [selectedDate, selectedServiceId]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );
  const selectedSlot = useMemo(() => slots.find((slot) => slot.id === selectedSlotId) ?? null, [slots, selectedSlotId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus(null);

    const response = await fetch("/api/client/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedServiceId,
        slotId: selectedSlotId,
        patientDetails,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(data?.error ?? "No se pudo completar la reserva.");
      setSubmitting(false);
      return;
    }

    router.push("/portal/client/appointments");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{clinic?.city ?? "DentPro"}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Schedule Your Visit</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Completa el formulario para reservar tu cita con nuestro equipo odontológico.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
              1
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Patient Details</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Nombre
              <input
                className="input h-11 text-sm"
                value={patientDetails.name}
                onChange={(event) => setPatientDetails((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Apellido
              <input
                className="input h-11 text-sm"
                value={patientDetails.lastName}
                onChange={(event) => setPatientDetails((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Email
              <input
                className="input h-11 text-sm"
                value={patientDetails.email}
                onChange={(event) => setPatientDetails((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Teléfono
              <input
                className="input h-11 text-sm"
                value={patientDetails.phone}
                onChange={(event) => setPatientDetails((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
              2
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Select Service</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {services.length ? (
              services.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <button
                    type="button"
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 dark:bg-surface-muted/60"
                        : "border-slate-200 bg-white hover:border-blue-200 dark:border-surface-muted/70 dark:bg-surface-elevated"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{service.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{service.description}</p>
                    <p className="mt-3 text-sm font-semibold text-blue-600">{formatter.format(service.priceCents)}</p>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No hay servicios disponibles.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
              3
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Date &amp; Time</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {buildDateOptions().map((date) => {
              const dateValue = date.toISOString().split("T")[0];
              const isActive = selectedDate === dateValue;
              return (
                <button
                  type="button"
                  key={dateValue}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-blue-200 dark:border-surface-muted/70 dark:text-slate-200"
                  }`}
                  onClick={() => {
                    setSelectedDate(dateValue);
                    setSelectedSlotId("");
                  }}
                  data-testid={`date-${dateValue}`}
                >
                  {date.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" })}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {slots.length ? (
              slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                return (
                  <button
                    type="button"
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-700 hover:border-blue-200 dark:border-surface-muted/70 dark:text-slate-200"
                    }`}
                    data-testid={`slot-${slot.id}`}
                  >
                    {new Date(slot.startAt).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No hay slots disponibles para esta fecha.</p>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Booking Summary</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span>Service</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedService ? formatter.format(selectedService.priceCents) : "--"}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedService?.name ?? "Selecciona un servicio"}</p>
            <div className="border-t border-dashed border-slate-200 pt-3 dark:border-surface-muted/70">
              <p className="text-xs uppercase tracking-wide text-slate-400">Date &amp; time</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedSlot ? new Date(selectedSlot.startAt).toLocaleDateString("es-CO") : "Selecciona un slot"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {selectedSlot
                  ? new Date(selectedSlot.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
                  : "--"}
              </p>
            </div>
            <div className="border-t border-dashed border-slate-200 pt-3 dark:border-surface-muted/70">
              <p className="text-xs uppercase tracking-wide text-slate-400">Location</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{clinic?.name ?? "DentPro"}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">{clinic?.address ?? "Sede principal"}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900 dark:border-surface-muted/70 dark:text-white">
            <span>Total Estimated</span>
            <span>{selectedService ? formatter.format(selectedService.priceCents) : "--"}</span>
          </div>

          {status ? <p className="mt-4 text-sm text-red-600">{status}</p> : null}

          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            onClick={handleSubmit}
            disabled={!selectedServiceId || !selectedSlotId || submitting}
            data-testid="confirm-appointment"
          >
            Confirm Appointment
          </button>
          <p className="mt-2 text-xs text-slate-400">No payment required until your visit.</p>
        </div>
      </aside>
    </div>
  );
}
