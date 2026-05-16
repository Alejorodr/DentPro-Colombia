"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

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

const SLOT_REFRESH_MS = 45_000;

export function ClientBookingForm() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [clinic, setClinic] = useState<DashboardClinic | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [slotStale, setSlotStale] = useState(false);
  const [patientDetails, setPatientDetails] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    documentId: "",
  });
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"error" | "warning">("error");
  const [submitting, setSubmitting] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSlotIdRef = useRef(selectedSlotId);
  useEffect(() => { selectedSlotIdRef.current = selectedSlotId; }, [selectedSlotId]);

  const fetchSlots = useCallback(async (date: string, serviceId: string, isRefresh = false) => {
    if (!isRefresh) setSlotsLoading(true);
    const query = new URLSearchParams({ date });
    if (serviceId) query.set("serviceId", serviceId);
    try {
      const res = await fetchWithRetry(`/api/slots?${query.toString()}`);
      const data = res.ok ? ((await res.json()) as { slots?: Slot[] }) : null;
      const freshSlots = data?.slots ?? [];
      setSlots(freshSlots);
      // If auto-refreshing and the selected slot is no longer available, warn the user
      if (isRefresh && selectedSlotIdRef.current && !freshSlots.some((s) => s.id === selectedSlotIdRef.current)) {
        setSelectedSlotId("");
        setStatusKind("warning");
        setStatus("El horario que habías seleccionado ya no está disponible. Por favor elige otro.");
      }
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWithRetry("/api/services?active=true&pageSize=50")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { data?: Service[] }) => setServices(data.data ?? []))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    void fetchWithRetry("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UserProfile | null) => {
        if (!data) return;
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
    void fetchWithRetry("/api/client/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DashboardResponse | null) => {
        if (data?.clinic) setClinic(data.clinic);
      })
      .catch(() => setClinic(null));
  }, []);

  // Fetch slots when date or service changes; auto-refresh every 45s
  useEffect(() => {
    if (!selectedDate) return;
    void fetchSlots(selectedDate, selectedServiceId);

    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(() => {
      void fetchSlots(selectedDate, selectedServiceId, true);
    }, SLOT_REFRESH_MS);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [selectedDate, selectedServiceId, fetchSlots]);

  // Mark slot as stale after 2 minutes of being selected without submitting
  useEffect(() => {
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    if (!selectedSlotId) {
      setSlotStale(false);
      return;
    }
    staleTimerRef.current = setTimeout(() => setSlotStale(true), 2 * 60 * 1000);
    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, [selectedSlotId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );
  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) ?? null,
    [slots, selectedSlotId],
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatus(null);

    const response = await fetchWithTimeout("/api/client/appointments", {
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
      const isSlotTaken = response.status === 409;
      setStatusKind(isSlotTaken ? "warning" : "error");
      setStatus(
        isSlotTaken
          ? "Este horario fue tomado justo ahora. Los turnos disponibles fueron actualizados — elige otro."
          : (data?.error ?? "No se pudo completar la reserva."),
      );
      if (isSlotTaken) {
        setSelectedSlotId("");
        setSlotStale(false);
        void fetchSlots(selectedDate, selectedServiceId);
      }
      setSubmitting(false);
      return;
    }

    router.push("/portal/client/appointments");
  };

  const canSubmit = !!selectedServiceId && !!selectedSlotId && !submitting;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{clinic?.city ?? "DentPro"}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Agenda tu visita</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Completa el formulario para reservar tu cita con nuestro equipo odontológico.
          </p>
        </div>

        {/* Step 1 - Datos del paciente */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/10 text-sm font-semibold text-brand-teal">
              1
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tus datos</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Nombre
              <input
                className="input h-11 text-sm"
                value={patientDetails.name}
                onChange={(e) => setPatientDetails((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Apellido
              <input
                className="input h-11 text-sm"
                value={patientDetails.lastName}
                onChange={(e) => setPatientDetails((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Email
              <input
                className="input h-11 text-sm"
                value={patientDetails.email}
                onChange={(e) => setPatientDetails((prev) => ({ ...prev, email: e.target.value }))}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Teléfono
              <input
                className="input h-11 text-sm"
                value={patientDetails.phone}
                onChange={(e) => setPatientDetails((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </label>
          </div>
        </section>

        {/* Step 2 - Servicio */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/10 text-sm font-semibold text-brand-teal">
              2
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Elige el servicio</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {services.length ? (
              services.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <button
                    type="button"
                    key={service.id}
                    onClick={() => {
                      setSelectedServiceId(service.id);
                      setSelectedSlotId("");
                      setStatus(null);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-brand-teal bg-brand-teal/5 dark:bg-surface-muted/60"
                        : "border-slate-200 bg-white hover:border-brand-teal/40 dark:border-surface-muted/70 dark:bg-surface-elevated"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{service.name}</p>
                    {service.description ? (
                      <p className="text-xs text-slate-500 dark:text-slate-300">{service.description}</p>
                    ) : null}
                    <p className="mt-3 text-sm font-semibold text-brand-teal">{formatter.format(service.priceCents)}</p>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No hay servicios disponibles.</p>
            )}
          </div>
        </section>

        {/* Step 3 - Fecha y hora */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/10 text-sm font-semibold text-brand-teal">
              3
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Fecha y hora</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {buildDateOptions().map((date) => {
              const dateValue = date.toISOString().split("T")[0];
              const isActive = selectedDate === dateValue;
              return (
                <button
                  type="button"
                  key={dateValue}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    isActive
                      ? "border-brand-teal bg-brand-teal text-white"
                      : "border-slate-200 text-slate-600 hover:border-brand-teal/40 dark:border-surface-muted/70 dark:text-slate-200"
                  }`}
                  onClick={() => {
                    setSelectedDate(dateValue);
                    setSelectedSlotId("");
                    setStatus(null);
                  }}
                  data-testid={`date-${dateValue}`}
                >
                  {date.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" })}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {slotsLoading ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-xl border border-slate-100 bg-slate-100 dark:border-surface-muted/30 dark:bg-surface-muted/30"
                  />
                ))}
              </div>
            ) : slots.length ? (
              <>
                {slotStale && selectedSlotId ? (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
                    <span>Llevas un rato con este horario seleccionado. ¿Sigue disponible?</span>
                    <button
                      type="button"
                      className="shrink-0 font-semibold underline underline-offset-2"
                      onClick={() => {
                        setSlotStale(false);
                        void fetchSlots(selectedDate, selectedServiceId, true);
                      }}
                    >
                      Verificar
                    </button>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <button
                        type="button"
                        key={slot.id}
                        onClick={() => {
                          setSelectedSlotId(slot.id);
                          setSlotStale(false);
                          setStatus(null);
                        }}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                          isSelected
                            ? "border-brand-teal bg-brand-teal text-white"
                            : "border-slate-200 text-slate-700 hover:border-brand-teal/40 dark:border-surface-muted/70 dark:text-slate-200"
                        }`}
                        data-testid={`slot-${slot.id}`}
                      >
                        <span className="block">
                          {new Date(slot.startAt).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="block text-[10px] font-normal opacity-75">
                          {slot.professional.user.name} {slot.professional.user.lastName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">
                No hay turnos disponibles para esta fecha. Prueba con otro día.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Sidebar summary */}
      <aside className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resumen de tu reserva</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Servicio</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                {selectedService?.name ?? "Selecciona un servicio"}
              </p>
              {selectedService ? (
                <p className="text-xs text-brand-teal">{formatter.format(selectedService.priceCents)}</p>
              ) : null}
            </div>
            <div className="border-t border-dashed border-slate-200 pt-3 dark:border-surface-muted/70">
              <p className="text-xs uppercase tracking-wide text-slate-400">Fecha y hora</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                {selectedSlot
                  ? new Date(selectedSlot.startAt).toLocaleDateString("es-CO", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })
                  : "Selecciona un turno"}
              </p>
              {selectedSlot ? (
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {new Date(selectedSlot.startAt).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {selectedSlot.professional.user.name} {selectedSlot.professional.user.lastName}
                </p>
              ) : null}
            </div>
            <div className="border-t border-dashed border-slate-200 pt-3 dark:border-surface-muted/70">
              <p className="text-xs uppercase tracking-wide text-slate-400">Sede</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{clinic?.name ?? "DentPro"}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">{clinic?.address ?? "Sede principal"}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-semibold text-slate-900 dark:border-surface-muted/70 dark:text-white">
            <span>Total estimado</span>
            <span>{selectedService ? formatter.format(selectedService.priceCents) : "--"}</span>
          </div>

          {status ? (
            <div
              className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                statusKind === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-400"
              }`}
            >
              {status}
            </div>
          ) : null}

          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-brand-teal px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-surface-muted/50"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="confirm-appointment"
          >
            {submitting ? "Procesando…" : "Confirmar cita"}
          </button>
          <p className="mt-2 text-xs text-slate-400">El pago se realiza en la consulta.</p>
        </div>
      </aside>
    </div>
  );
}
