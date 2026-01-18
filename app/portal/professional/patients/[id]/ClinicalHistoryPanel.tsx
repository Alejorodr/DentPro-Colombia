"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CLINICAL_ATTACHMENT_ALLOWED_TYPES,
  CLINICAL_ATTACHMENT_MAX_BYTES,
} from "@/lib/clinical/attachments";

const MAX_LABEL = `${Math.round(CLINICAL_ATTACHMENT_MAX_BYTES / (1024 * 1024))}MB`;

type EpisodeSummary = {
  id: string;
  date: string;
  reason?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  visibleToPatient?: boolean;
  professionalName: string;
};

type EpisodeNote = {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  authorName: string;
};

type Prescription = {
  id: string;
  issuedAt: string;
  content: { text?: string } | null;
};

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  visibleToPatient: boolean;
};

export function ClinicalHistoryPanel({ patientId }: { patientId: string }) {
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    reason: "",
    diagnosis: "",
    treatmentPlan: "",
    notes: "",
    visibleToPatient: false,
  });
  const [saving, setSaving] = useState(false);

  const loadEpisodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/clinical/patients/${patientId}/episodes?pageSize=20`);
      if (!response.ok) {
        throw new Error("No se pudo cargar la historia clínica.");
      }
      const data = (await response.json()) as { data?: EpisodeSummary[] };
      setEpisodes(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadEpisodes();
  }, [loadEpisodes]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/clinical/patients/${patientId}/episodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          reason: formState.reason.trim(),
          diagnosis: formState.diagnosis.trim(),
          treatmentPlan: formState.treatmentPlan.trim(),
          notes: formState.notes.trim(),
        }),
      });
      if (!response.ok) {
        throw new Error("No se pudo crear el episodio.");
      }
      setFormState({ reason: "", diagnosis: "", treatmentPlan: "", notes: "", visibleToPatient: false });
      await loadEpisodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando episodios...</p>;
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200"
      >
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nuevo episodio</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Motivo</span>
            <input
              type="text"
              value={formState.reason}
              onChange={(event) => setFormState((prev) => ({ ...prev, reason: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none focus:border-brand-indigo dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Dolor, control, seguimiento..."
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnóstico</span>
            <input
              type="text"
              value={formState.diagnosis}
              onChange={(event) => setFormState((prev) => ({ ...prev, diagnosis: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none focus:border-brand-indigo dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Diagnóstico principal"
            />
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plan de tratamiento</span>
            <textarea
              rows={3}
              value={formState.treatmentPlan}
              onChange={(event) => setFormState((prev) => ({ ...prev, treatmentPlan: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none focus:border-brand-indigo dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Plan sugerido, fases y recomendaciones"
            />
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notas clínicas</span>
            <textarea
              rows={3}
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none focus:border-brand-indigo dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Observaciones relevantes"
            />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
          <input
            type="checkbox"
            checked={formState.visibleToPatient}
            onChange={(event) => setFormState((prev) => ({ ...prev, visibleToPatient: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Visible para el paciente (solo resumen).
        </label>
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo/90 disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Crear episodio"}
        </button>
      </form>

      <div className="space-y-4">
        {episodes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
            No hay episodios registrados para este paciente.
          </div>
        ) : (
          episodes.map((episode) => <EpisodeCard key={episode.id} episode={episode} />)
        )}
      </div>
    </div>
  );
}

function EpisodeCard({ episode }: { episode: EpisodeSummary }) {
  const [notes, setNotes] = useState<EpisodeNote[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("EVOLUTION");
  const [prescriptionContent, setPrescriptionContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [visibleAttachment, setVisibleAttachment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = useMemo(() => new Date(episode.date).toLocaleDateString("es-CO"), [episode.date]);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notesResponse, prescriptionsResponse, attachmentsResponse] = await Promise.all([
        fetch(`/api/clinical/episodes/${episode.id}/notes`),
        fetch(`/api/clinical/episodes/${episode.id}/prescriptions`),
        fetch(`/api/clinical/episodes/${episode.id}/attachments`),
      ]);
      if (!notesResponse.ok || !prescriptionsResponse.ok || !attachmentsResponse.ok) {
        throw new Error("No se pudo cargar el detalle del episodio.");
      }
      const notesData = (await notesResponse.json()) as { notes?: EpisodeNote[] };
      const prescriptionsData = (await prescriptionsResponse.json()) as { prescriptions?: Prescription[] };
      const attachmentsData = (await attachmentsResponse.json()) as { attachments?: Attachment[] };
      setNotes(notesData.notes ?? []);
      setPrescriptions(prescriptionsData.prescriptions ?? []);
      setAttachments(attachmentsData.attachments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }, [episode.id]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const handleNoteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!noteContent.trim()) {
      return;
    }
    setError(null);

    const response = await fetch(`/api/clinical/episodes/${episode.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: noteType, content: noteContent }),
    });

    if (!response.ok) {
      setError("No se pudo guardar la nota.");
      return;
    }

    setNoteContent("");
    await loadDetails();
  };

  const handlePrescriptionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prescriptionContent.trim()) {
      return;
    }
    setError(null);

    const response = await fetch(`/api/clinical/episodes/${episode.id}/prescriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: prescriptionContent }),
    });

    if (!response.ok) {
      setError("No se pudo emitir la receta.");
      return;
    }

    setPrescriptionContent("");
    await loadDetails();
  };

  const handleAttachmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || !file.name) {
      setError("Selecciona un archivo.");
      return;
    }

    setUploading(true);
    formData.set("visibleToPatient", visibleAttachment ? "true" : "false");

    try {
      const response = await fetch(`/api/clinical/episodes/${episode.id}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("No se pudo subir el archivo.");
      }
      event.currentTarget.reset();
      setVisibleAttachment(false);
      await loadDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-950">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{formattedDate}</p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {episode.reason || "Consulta clínica"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">Profesional: {episode.professionalName}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            episode.visibleToPatient
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {episode.visibleToPatient ? "Visible para paciente" : "Solo interno"}
        </span>
        <a
          href={`/portal/professional/episode/${episode.id}/print`}
          className="text-[11px] font-semibold text-brand-indigo"
        >
          Imprimir resumen
        </a>
      </header>

      <div className="mt-4 grid gap-4 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diagnóstico</p>
          <p>{episode.diagnosis || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plan</p>
          <p>{episode.treatmentPlan || "—"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notas clínicas</p>
          <p>{episode.notes || "—"}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Notas de evolución</h4>
            {loading ? <span className="text-xs text-slate-400">Cargando...</span> : null}
          </div>
          <ul className="space-y-2">
            {notes.length === 0 ? (
              <li className="text-xs text-slate-500">Sin notas registradas.</li>
            ) : (
              notes.map((note) => (
                <li key={note.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{note.type}</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{note.content}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {note.authorName} · {new Date(note.createdAt).toLocaleString("es-CO")}
                  </p>
                </li>
              ))
            )}
          </ul>
          <form onSubmit={handleNoteSubmit} className="space-y-2">
            <select
              value={noteType}
              onChange={(event) => setNoteType(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="EVOLUTION">Evolución</option>
              <option value="OBSERVATION">Observación</option>
              <option value="DIAGNOSIS">Diagnóstico</option>
              <option value="PLAN">Plan</option>
            </select>
            <textarea
              rows={3}
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              placeholder="Escribe una nota..."
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-indigo px-3 py-2 text-xs font-semibold text-white"
            >
              Guardar nota
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Recetas</h4>
          </div>
          <ul className="space-y-2">
            {prescriptions.length === 0 ? (
              <li className="text-xs text-slate-500">Sin recetas emitidas.</li>
            ) : (
              prescriptions.map((prescription) => (
                <li key={prescription.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">Receta</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {prescription.content?.text ?? "Sin detalle"}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Emitida {new Date(prescription.issuedAt).toLocaleDateString("es-CO")}
                  </p>
                  <a
                    href={`/portal/professional/prescription/${prescription.id}/print`}
                    className="mt-2 inline-flex text-[11px] font-semibold text-brand-indigo"
                  >
                    Imprimir receta
                  </a>
                </li>
              ))
            )}
          </ul>
          <form onSubmit={handlePrescriptionSubmit} className="space-y-2">
            <textarea
              rows={3}
              value={prescriptionContent}
              onChange={(event) => setPrescriptionContent(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              placeholder="Indicaciones de la receta"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-indigo px-3 py-2 text-xs font-semibold text-white"
            >
              Emitir receta
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Adjuntos</h4>
          </div>
          <ul className="space-y-2">
            {attachments.length === 0 ? (
              <li className="text-xs text-slate-500">Sin archivos cargados.</li>
            ) : (
              attachments.map((attachment) => (
                <li key={attachment.id} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{attachment.filename}</p>
                  <p className="mt-1 text-slate-500">
                    {attachment.mimeType} · {(attachment.size / 1024).toFixed(1)} KB
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {attachment.visibleToPatient ? "Visible" : "Interno"}
                    </span>
                    <a
                      href={`/api/clinical/attachments/${attachment.id}/download`}
                      className="text-[11px] font-semibold text-brand-indigo"
                    >
                      Descargar
                    </a>
                  </div>
                </li>
              ))
            )}
          </ul>
          <form onSubmit={handleAttachmentSubmit} className="space-y-2">
            <input
              name="file"
              type="file"
              accept={CLINICAL_ATTACHMENT_ALLOWED_TYPES.join(",")}
              className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-600 dark:file:bg-slate-800 dark:file:text-slate-200"
            />
            <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-300">
              <input
                type="checkbox"
                checked={visibleAttachment}
                onChange={(event) => setVisibleAttachment(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Visible para el paciente.
            </label>
            <p className="text-[11px] text-slate-400">
              Tipos permitidos: {CLINICAL_ATTACHMENT_ALLOWED_TYPES.join(", ")} · Máx {MAX_LABEL}.
            </p>
            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-xl bg-brand-indigo px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {uploading ? "Subiendo..." : "Subir adjunto"}
            </button>
          </form>
        </section>
      </div>

      {error ? <p className="mt-4 text-xs text-red-600">{error}</p> : null}
    </article>
  );
}
