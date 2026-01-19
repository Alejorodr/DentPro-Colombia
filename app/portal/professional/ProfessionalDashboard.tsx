"use client";

import { useEffect, useMemo, useState } from "react";
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
import { calculateAge, maskId, maskName } from "@/lib/professional";
import { useProfessionalPreferences } from "@/app/portal/professional/components/ProfessionalContext";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import type {
  ProfessionalAppointmentDetail,
  ProfessionalDashboardAppointment,
} from "@/app/portal/professional/types";

const statusStyles: Record<AppointmentStatus, string> = {
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-400/30",
  CONFIRMED: "text-emerald-400 bg-emerald-500/10 border-emerald-400/30",
  CANCELLED: "text-rose-400 bg-rose-500/10 border-rose-400/30",
  COMPLETED: "text-blue-400 bg-blue-500/10 border-blue-400/30",
};

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
};

const tabOptions = ["Clinical Overview", "X-Rays & Imaging", "History"] as const;

type TabOption = (typeof tabOptions)[number];
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
  const [tab, setTab] = useState<TabOption>("Clinical Overview");
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
    } catch (error) {
      console.error(error);
    }
  };

  const saveNotes = async () => {
    setIsSaving(true);
    await persistNotes();
    setIsSaving(false);
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
    let filename = file?.name ?? url?.split("/").pop() ?? "Attachment";
    let mimeType = file?.type;
    let size = file?.size;

    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setUploadError("Archivo demasiado grande. Usa una URL para archivos mayores a 2MB.");
        return;
      }
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Error reading file"));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Portal Profesional</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1.1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Daily Schedule</h2>
            <span className="rounded-full bg-brand-indigo/10 px-3 py-1 text-xs font-semibold text-brand-indigo">
              {new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {schedule.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
                No appointments scheduled for this day.
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
                        {new Date(appointment.startAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", statusStyles[appointment.status])}>
                        {statusLabels[appointment.status]}
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
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          {!appointmentDetail ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
              <p className="text-base font-semibold text-slate-900 dark:text-white">Select an appointment</p>
              <p className="mt-2 max-w-xs">Choose an appointment from the schedule to review patient details.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Patient</p>
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{selectedPatientName}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>{selectedAge ? `${selectedAge} Years` : "Age N/A"}</span>
                    <span>{appointmentDetail.patient.gender ?? ""}</span>
                    <span>ID: {selectedPatientCode || "—"}</span>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  ACTIVE PATIENT
                </span>
              </div>

              {criticalAllergy ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  <ShieldWarning size={20} className="mt-1" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">Critical Allergy</p>
                    <p className="font-semibold text-rose-100">
                      Patient is allergic to {criticalAllergy.substance}.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {tabOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTab(option)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide",
                      tab === option
                        ? "border-brand-indigo bg-brand-indigo/10 text-brand-indigo"
                        : "border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {tab === "Clinical Overview" ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Last Visit</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {appointmentDetail.history[0]?.startAt
                        ? new Date(appointmentDetail.history[0].startAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No previous visits"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {appointmentDetail.history[0]?.reason ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Plan Status</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {appointmentDetail.patient.insuranceStatus === "ACTIVE" ? "Active" : "No active plan"}
                    </p>
                    <p className="text-xs text-slate-500">{appointmentDetail.patient.insuranceProvider ?? "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Insurance</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {appointmentDetail.patient.insuranceProvider ?? "No provider"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {appointmentDetail.patient.insuranceStatus ?? "UNKNOWN"}
                    </p>
                  </div>
                </div>
              ) : null}

              {tab === "X-Rays & Imaging" ? (
                <div className="space-y-3">
                  {appointmentDetail.attachments.filter((item) => item.kind === AttachmentKind.XRAY).length === 0 ? (
                    <p className="text-sm text-slate-500">No imaging files added yet.</p>
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
                              Open
                            </Link>
                          ) : item.dataUrl ? (
                            <Link className="text-xs font-semibold text-brand-indigo" href={item.dataUrl} target="_blank">
                              Preview
                            </Link>
                          ) : null}
                        </div>
                      ))
                  )}
                </div>
              ) : null}

              {tab === "History" ? (
                <div className="space-y-3">
                  {appointmentDetail.history.length === 0 ? (
                    <p className="text-sm text-slate-500">No previous history recorded.</p>
                  ) : (
                    appointmentDetail.history.map((history) => (
                      <div
                        key={history.id}
                        className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 dark:text-white">{history.reason}</p>
                          <span>{history.status}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(history.startAt).toLocaleDateString("es-CO", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Procedural Notes</h3>
              <button
                type="button"
                onClick={handleSpeech}
                disabled={!hasSpeechSupport}
                title={hasSpeechSupport ? "Dictate" : "No disponible"}
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
              placeholder="Start typing procedural observations here..."
              className="mt-4 h-48 w-full rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 outline-hidden focus-visible:ring-2 focus-visible:ring-brand-indigo/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>{appointmentDetail?.clinicalNotes.at(0)?.updatedAt ? "Autosaved" : "No notes yet"}</span>
              <button
                type="button"
                onClick={saveNotes}
                className="rounded-full border border-brand-indigo px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-indigo"
              >
                Save notes
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Issue Prescription</h3>
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
                <option value={PrescriptionItemType.MEDICATION}>Medication</option>
                <option value={PrescriptionItemType.PROCEDURE}>Procedure</option>
              </select>
              <input
                value={prescriptionForm.name}
                onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Medication or procedure"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  value={prescriptionForm.dosage}
                  onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, dosage: event.target.value }))}
                  placeholder="Dosage"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
                <input
                  value={prescriptionForm.frequency}
                  onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, frequency: event.target.value }))}
                  placeholder="Frequency"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <input
                value={prescriptionForm.instructions}
                onChange={(event) => setPrescriptionForm((prev) => ({ ...prev, instructions: event.target.value }))}
                placeholder="Instructions"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={addPrescriptionItem}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-indigo bg-brand-indigo/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-indigo"
            >
              <CheckCircle size={16} />
              Add to Prescription
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
              <h4 className="text-sm font-semibold">Upload X-Ray</h4>
              <p className="text-xs text-slate-500">Import from device or add a link.</p>
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
                  placeholder="Add imaging link (URL)"
                  onBlur={(event) => {
                    if (event.target.value.trim()) {
                      void handleUpload(null, event.target.value.trim());
                      event.target.value = "";
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
                {uploadError ? <p className="text-xs text-rose-400">{uploadError}</p> : null}
                {uploading ? <p className="text-xs text-slate-400">Uploading...</p> : null}
                <p className="text-[11px] text-slate-400">For production, configure external storage.</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
              <h4 className="text-sm font-semibold">Print Summary</h4>
              <p className="text-xs text-slate-500">Generate a printable visit summary.</p>
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
                Print Summary
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
            <label className="flex items-center gap-3 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={markCompleted}
                onChange={(event) => setMarkCompleted(event.target.checked)}
                className="h-4 w-4 rounded-sm border-slate-300 text-brand-indigo focus:ring-brand-indigo"
              />
              Mark appointment as completed
            </label>
            <button
              type="button"
              onClick={handleSaveToHistory}
              disabled={!selectedAppointmentId || isSaving}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-indigo bg-brand-indigo px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white"
            >
              <FileArrowUp size={16} />
              Save to History
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
