"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  CalendarBlank,
  CheckCircle,
  FileArrowUp,
  FileText,
  Microphone,
  Printer,
  ShieldWarning,
} from "@/components/ui/Icon";
import { AppointmentStatus, AttachmentKind, PrescriptionItemType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { operationalStatusLabel } from "@/lib/appointments/status";
import { appointmentStatusBadge } from "@/lib/portal/appointment-status";
import { ActivityFeed } from "@/app/portal/components/activity/ActivityFeed";
import { calculateAge, maskId, maskName } from "@/lib/professional";
import { useProfessionalPreferences } from "@/app/portal/professional/components/ProfessionalContext";
import { DayScheduleGrid } from "@/app/portal/professional/components/DayScheduleGrid";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import type {
  ProfessionalAppointmentDetail,
  ProfessionalDashboardAppointment,
} from "@/app/portal/professional/types";


type TabKey = "overview" | "imaging" | "history";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Resumen clínico" },
  { key: "imaging", label: "Radiografías e imágenes" },
  { key: "history", label: "Historial" },
];

type PrescriptionFormState = {
  type: PrescriptionItemType;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
};

export function ProfessionalDashboard() {
  const searchParams = useSearchParams();
  const { privacyMode } = useProfessionalPreferences();
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [schedule, setSchedule] = useState<ProfessionalDashboardAppointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [appointmentDetail, setAppointmentDetail] = useState<ProfessionalAppointmentDetail | null>(null);
  const [notesContent, setNotesContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionFormState>({
    type: PrescriptionItemType.MEDICATION,
    name: "",
    dosage: "",
    frequency: "",
    instructions: "",
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [markCompleted, setMarkCompleted] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [calendarView, setCalendarView] = useState<"list" | "grid">("grid");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasSpeechSupport("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  useEffect(() => {
    let active = true;
    const loadSchedule = async () => {
      try {
        const response = await fetchWithRetry(`/api/professional/dashboard?date=${selectedDate}`);
        if (!response.ok) return;
        const data = (await response.json()) as { appointments: ProfessionalDashboardAppointment[] };
        if (!active) return;
        setSchedule(data.appointments ?? []);
        const requestedAppointment = searchParams.get("appointment");
        if (requestedAppointment && data.appointments?.some((item) => item.id === requestedAppointment)) {
          setSelectedAppointmentId(requestedAppointment);
        } else if (data.appointments?.length) {
          const hasSelected = selectedAppointmentId
            ? data.appointments.some((item) => item.id === selectedAppointmentId)
            : false;
          if (!hasSelected) {
            setSelectedAppointmentId(data.appointments[0].id);
          }
        } else {
          setSelectedAppointmentId(null);
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadSchedule();

    return () => {
      active = false;
    };
  }, [searchParams, selectedDate, selectedAppointmentId]);

  useEffect(() => {
    if (!selectedAppointmentId) {
      setAppointmentDetail(null);
      setNotesContent("");
      return;
    }

    let active = true;
    const loadDetail = async () => {
      try {
        const response = await fetchWithRetry(`/api/professional/appointment/${selectedAppointmentId}`);
        if (!response.ok) return;
        const data = (await response.json()) as ProfessionalAppointmentDetail;
        if (!active) return;
        setAppointmentDetail(data);
        const latestNote = data.clinicalNotes.at(0)?.content ?? "";
        setNotesContent(latestNote);
      } catch (error) {
        console.error(error);
      }
    };

    loadDetail();

    return () => {
      active = false;
    };
  }, [selectedAppointmentId]);

  // Auto-save notes 2 s after the user stops typing
  useEffect(() => {
    if (!selectedAppointmentId || !notesContent) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      void persistNotes();
    }, 2000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
    // persistNotes reads selectedAppointmentId and notesContent via closure — intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesContent, selectedAppointmentId]);

  const selectedPatientName = useMemo(() => {
    if (!appointmentDetail) return "";
    const fullName = `${appointmentDetail.patient.name} ${appointmentDetail.patient.lastName}`.trim();
    return privacyMode ? maskName(fullName) : fullName;
  }, [appointmentDetail, privacyMode]);

  const selectedPatientCode = useMemo(() => {
    const code = appointmentDetail?.patient.patientCode ?? "";
    return privacyMode ? maskId(code) : code;
  }, [appointmentDetail, privacyMode]);

  const selectedAge = useMemo(() => {
    return calculateAge(appointmentDetail?.patient.dateOfBirth ?? null);
  }, [appointmentDetail]);

  const criticalAllergy = appointmentDetail?.allergies.find((allergy) => allergy.severity === "CRITICAL");

  const dayMetrics = useMemo(() => {
    const total = schedule.length;
    const attended = schedule.filter((appointment) => appointment.status === AppointmentStatus.COMPLETED).length;
    return { total, attended };
  }, [schedule]);

  const handleSpeech = () => {
    if (!hasSpeechSupport) return;
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return;
    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = "es-CO";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcripts: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result[0];
        if (alternative?.transcript) {
          transcripts.push(alternative.transcript);
        }
      }
      const transcript = transcripts.join(" ");
      setNotesContent((prev) => `${prev}${prev ? " " : ""}${transcript}`.trim());
    };
    recognition.start();
  };

  const persistNotes = async () => {
    if (!selectedAppointmentId) return;
    try {
      await fetchWithTimeout(`/api/professional/appointment/${selectedAppointmentId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: notesContent }),
      });
      setLastSavedAt(new Date());
    } catch (error) {
      console.error(error);
    }
  };

  const saveNotes = async () => {
    setIsSaving(true);
    await persistNotes();
    setIsSaving(false);
  };

  const changeStatus = async (newStatus: AppointmentStatus) => {
    if (!selectedAppointmentId) return;
    setIsSaving(true);
    try {
      const response = await fetchWithTimeout(`/api/appointments/${selectedAppointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) return;
      const [detailRes, scheduleRes] = await Promise.all([
        fetchWithRetry(`/api/professional/appointment/${selectedAppointmentId}`),
        fetchWithRetry(`/api/professional/dashboard?date=${selectedDate}`),
      ]);
      if (detailRes.ok) {
        const data = (await detailRes.json()) as ProfessionalAppointmentDetail;
        setAppointmentDetail(data);
      }
      if (scheduleRes.ok) {
        const data = (await scheduleRes.json()) as { appointments: ProfessionalDashboardAppointment[] };
        setSchedule(data.appointments ?? []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const addPrescriptionItem = async () => {
    if (!selectedAppointmentId || !prescriptionForm.name.trim()) return;
    try {
      const response = await fetchWithTimeout(`/api/professional/appointment/${selectedAppointmentId}/prescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: { ...prescriptionForm, name: prescriptionForm.name.trim() } }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { prescription: ProfessionalAppointmentDetail["prescription"] };
      setAppointmentDetail((prev) => (prev ? { ...prev, prescription: data.prescription } : prev));
      setPrescriptionForm({
        type: PrescriptionItemType.MEDICATION,
        name: "",
        dosage: "",
        frequency: "",
        instructions: "",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpload = async (file?: File | null, url?: string | null) => {
    if (!selectedAppointmentId) return;
    setUploadError(null);

    let dataUrl: string | undefined;
    const filename = file?.name ?? url?.split("/").pop() ?? "Adjunto";
    const mimeType = file?.type;
    const size = file?.size;

    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("Archivo demasiado grande. Usa una URL para archivos mayores a 2MB.");
        return;
      }
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsDataURL(file);
      });
    }

    if (!dataUrl && !url) {
      setUploadError("Agrega un enlace o selecciona un archivo.");
      return;
    }

    setUploading(true);
    try {
      const response = await fetchWithTimeout(`/api/professional/appointment/${selectedAppointmentId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: AttachmentKind.XRAY,
          filename,
          mimeType,
          size,
          url: url?.trim() || null,
          dataUrl: dataUrl ?? null,
        }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { attachment: ProfessionalAppointmentDetail["attachments"][number] };
      setAppointmentDetail((prev) => (prev ? { ...prev, attachments: [data.attachment, ...prev.attachments] } : prev));
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!selectedAppointmentId) return;
    setIsSaving(true);
    try {
      await persistNotes();
      if (markCompleted) {
        await fetchWithTimeout(`/api/appointments/${selectedAppointmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: AppointmentStatus.COMPLETED }),
        });
      }
      const response = await fetchWithRetry(`/api/professional/appointment/${selectedAppointmentId}`);
      if (response.ok) {
        const data = (await response.json()) as ProfessionalAppointmentDetail;
        setAppointmentDetail(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Portal Profesional</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Mi agenda</h1>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <CalendarBlank size={16} />
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-600 outline-hidden dark:text-slate-200"
          />
        </label>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Citas del día</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{dayMetrics.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Atendidas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{dayMetrics.attended}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1.1fr)]">
        {/* Left column: schedule */}
        <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Agenda del día</h2>
              <p className="text-xs capitalize text-slate-500">{formattedDate}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setCalendarView("grid")}
                title="Vista de horario"
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  calendarView === "grid"
                    ? "bg-brand-indigo text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-300",
                )}
              >
                Cuadrícula
              </button>
              <button
                type="button"
                onClick={() => setCalendarView("list")}
                title="Vista de lista"
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  calendarView === "list"
                    ? "bg-brand-indigo text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-300",
                )}
              >
                Lista
              </button>
            </div>
          </div>

          {calendarView === "grid" ? (
            <DayScheduleGrid
              appointments={schedule}
              selectedId={selectedAppointmentId}
              onSelect={setSelectedAppointmentId}
              privacyMode={privacyMode}
            />
          ) : (
            <div className="space-y-3">
              {schedule.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
                  Sin citas programadas para este día.
                </div>
              ) : (
                schedule.map((appointment) => {
                  const isActive = appointment.id === selectedAppointmentId;
                  const patientName = `${appointment.patient.name} ${appointment.patient.lastName}`.trim();
                  return (
                    <button
                      type="button"
                      key={appointment.id}
                      onClick={() => setSelectedAppointmentId(appointment.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition",
                        isActive
                          ? "border-brand-indigo bg-brand-indigo/10 shadow-lg shadow-brand-indigo/20"
                          : "border-slate-200 bg-white hover:border-brand-indigo/50 dark:border-slate-800 dark:bg-slate-900",
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {new Date(appointment.startAt).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", appointmentStatusBadge(appointment.status))}>
                          {operationalStatusLabel(appointment.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                        {privacyMode ? maskName(patientName) : patientName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appointment.serviceName ?? appointment.reason}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Center column: patient detail */}
        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          {!appointmentDetail ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
              <p className="text-base font-semibold text-slate-900 dark:text-white">Selecciona una cita</p>
              <p className="mt-2 max-w-xs">Elige una cita de la agenda para ver el detalle del paciente.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Paciente</p>
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{selectedPatientName}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>{selectedAge ? `${selectedAge} años` : "Edad no disponible"}</span>
                    <span>{appointmentDetail.patient.gender ?? ""}</span>
                    <span>ID: {selectedPatientCode || "—"}</span>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  PACIENTE ACTIVO
                </span>
              </div>

              {criticalAllergy ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  <ShieldWarning size={20} className="mt-1" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">Alergia crítica</p>
                    <p className="font-semibold text-rose-100">
                      El paciente es alérgico a {criticalAllergy.substance}.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {tabs.map((tabItem) => (
                  <button
                    key={tabItem.key}
                    type="button"
                    onClick={() => setTab(tabItem.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide",
                      tab === tabItem.key
                        ? "border-brand-indigo bg-brand-indigo/10 text-brand-indigo"
                        : "border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300",
                    )}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </div>

              {tab === "overview" ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Última visita</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {appointmentDetail.history[0]?.startAt
                        ? new Date(appointmentDetail.history[0].startAt).toLocaleDateString("es-CO", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Sin visitas previas"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {appointmentDetail.history[0]?.reason ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Plan de salud</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {appointmentDetail.patient.insuranceStatus === "ACTIVE" ? "Activo" : "Sin plan activo"}
                    </p>
                    <p className="text-xs text-slate-500">{appointmentDetail.patient.insuranceProvider ?? "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Aseguradora</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {appointmentDetail.patient.insuranceProvider ?? "Sin proveedor"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {appointmentDetail.patient.insuranceStatus === "ACTIVE"
                        ? "Activa"
                        : appointmentDetail.patient.insuranceStatus === "INACTIVE"
                          ? "Inactiva"
                          : "No definida"}
                    </p>
                  </div>
                </div>
              ) : null}

              {tab === "imaging" ? (
                <div className="space-y-3">
                  {appointmentDetail.attachments.filter((item) => item.kind === AttachmentKind.XRAY).length === 0 ? (
                    <p className="text-sm text-slate-500">No hay imágenes adjuntas aún.</p>
                  ) : (
                    appointmentDetail.attachments
                      .filter((item) => item.kind === AttachmentKind.XRAY)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{item.filename}</p>
                            <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("es-CO")}</p>
                          </div>
                          {item.url ? (
                            <Link className="text-xs font-semibold text-brand-indigo" href={item.url} target="_blank">
                              Abrir
                            </Link>
                          ) : item.dataUrl ? (
                            <Link className="text-xs font-semibold text-brand-indigo" href={item.dataUrl} target="_blank">
                              Vista previa
                            </Link>
                          ) : null}
                        </div>
                      ))
                  )}
                </div>
              ) : null}

              {tab === "history" ? (
                <div className="space-y-3">
                  {appointmentDetail.history.length === 0 ? (
                    <p className="text-sm text-slate-500">Sin historial previo registrado.</p>
                  ) : (
                    appointmentDetail.history.map((history) => (
                      <div
                        key={history.id}
                        className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 dark:text-white">{history.reason}</p>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", appointmentStatusBadge(history.status))}>
                            {operationalStatusLabel(history.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(history.startAt).toLocaleDateString("es-CO", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        {history.notes ? (
                          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                            {history.notes}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          )}
        </section>

        {/* Right column: clinical actions */}
        <section className="space-y-4">
          {/* Status widget */}
          {appointmentDetail ? (
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Estado de la cita</p>
                  <span className={cn("mt-1 inline-block rounded-full border px-3 py-1 text-xs font-semibold", appointmentStatusBadge(appointmentDetail.appointment.status))}>
                    {operationalStatusLabel(appointmentDetail.appointment.status)}
                  </span>
                </div>
                {(appointmentDetail.appointment.status === AppointmentStatus.SCHEDULED || appointmentDetail.appointment.status === AppointmentStatus.CONFIRMED) ? (
                  <button
                    type="button"
                    onClick={() => void changeStatus(AppointmentStatus.CHECKED_IN)}
                    disabled={isSaving}
                    className="shrink-0 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-600 transition hover:bg-cyan-500/20 disabled:opacity-50 dark:text-cyan-400"
                  >
                    Registrar llegada
                  </button>
                ) : null}
                {appointmentDetail.appointment.status === AppointmentStatus.CHECKED_IN ? (
                  <span className="shrink-0 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    Paciente presente ✓
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notas del procedimiento</h3>
              <button
                type="button"
                onClick={handleSpeech}
                disabled={!hasSpeechSupport}
                title={hasSpeechSupport ? "Dictar nota" : "Dictado no disponible"}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full border",
                  hasSpeechSupport
                    ? "border-brand-indigo text-brand-indigo"
                    : "border-slate-300 text-slate-400",
                )}
              >
                <Microphone size={18} weight="bold" />
              </button>
            </div>
            <textarea
              value={notesContent}
              onChange={(event) => setNotesContent(event.target.value)}
              placeholder="Escribe aquí las observaciones del procedimiento…"
              className="mt-4 h-48 w-full rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 outline-hidden focus-visible:ring-2 focus-visible:ring-brand-indigo/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                {lastSavedAt
                  ? `Auto-guardado ${lastSavedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`
                  : appointmentDetail?.clinicalNotes.at(0)?.updatedAt
                    ? "Guardado"
                    : "Sin notas aún"}
              </span>
              <button
                type="button"
                onClick={saveNotes}
                disabled={isSaving}
                className="rounded-full border border-brand-indigo px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-indigo"
              >
                {isSaving ? "Guardando…" : "Guardar notas"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Emitir prescripción</h3>
              <FileText size={20} className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              <select
                value={prescriptionForm.type}
                onChange={(event) =>
                  setPrescriptionForm((prev) => ({
                    ...prev,
                    type: event.target.value as PrescriptionItemType,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value={PrescriptionItemType.MEDICATION}>Medicamento</option>
                <option value={PrescriptionItemType.PROCEDURE}>Procedimiento</option>
              </select>
              <input
                value={prescriptionForm.name}
                onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nombre del medicamento o procedimiento"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  value={prescriptionForm.dosage}
                  onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, dosage: event.target.value }))}
                  placeholder="Dosis"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
                <input
                  value={prescriptionForm.frequency}
                  onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, frequency: event.target.value }))}
                  placeholder="Frecuencia"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <input
                value={prescriptionForm.instructions}
                onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, instructions: event.target.value }))}
                placeholder="Instrucciones"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={addPrescriptionItem}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-indigo bg-brand-indigo/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-indigo"
            >
              <CheckCircle size={16} />
              Agregar a prescripción
            </button>
            {appointmentDetail?.prescription?.items?.length ? (
              <div className="mt-4 space-y-2">
                {appointmentDetail.prescription.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900">
                    <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-slate-500">
                      {item.dosage || ""} {item.frequency ? `· ${item.frequency}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <h4 className="text-sm font-semibold">Subir radiografía</h4>
              <p className="text-xs text-slate-500">Importa desde tu dispositivo o agrega un enlace.</p>
              <div className="mt-3 space-y-2">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    void handleUpload(file, null);
                  }}
                  className="w-full text-xs text-slate-500"
                />
                <input
                  type="url"
                  placeholder="URL de imagen o archivo"
                  onBlur={(event) => {
                    if (event.target.value.trim()) {
                      void handleUpload(null, event.target.value.trim());
                      event.target.value = "";
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
                {uploadError ? <p className="text-xs text-rose-400">{uploadError}</p> : null}
                {uploading ? <p className="text-xs text-slate-400">Subiendo…</p> : null}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <h4 className="text-sm font-semibold">Imprimir resumen</h4>
              <p className="text-xs text-slate-500">Genera un resumen imprimible de la visita.</p>
              <Link
                href={selectedAppointmentId ? `/portal/professional/appointment/${selectedAppointmentId}/print` : "#"}
                className={cn(
                  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-wide",
                  selectedAppointmentId
                    ? "border-brand-indigo text-brand-indigo"
                    : "border-slate-200 text-slate-400",
                )}
                target="_blank"
              >
                <Printer size={16} />
                Imprimir resumen
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
            <label className="flex items-center gap-3 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={markCompleted}
                onChange={(event) => setMarkCompleted(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-indigo focus:ring-brand-indigo"
              />
              Marcar cita como completada
            </label>
            <button
              type="button"
              onClick={handleSaveToHistory}
              disabled={!selectedAppointmentId || isSaving}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-indigo bg-brand-indigo px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
            >
              <FileArrowUp size={16} />
              {isSaving ? "Guardando…" : "Guardar en historial"}
            </button>
          </div>
        </section>
      </div>
      <ActivityFeed title="Actividad clínica del día" limit={8} />
    </div>
  );
}
