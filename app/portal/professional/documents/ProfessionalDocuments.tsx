"use client";

import { useEffect, useState } from "react";

import { FileText } from "@phosphor-icons/react";
import { AttachmentKind } from "@prisma/client";

interface AttachmentItem {
  id: string;
  filename: string;
  url?: string | null;
  dataUrl?: string | null;
  createdAt: string;
  patient?: { id: string; name: string; lastName: string } | null;
}

interface PatientOption {
  id: string;
  name: string;
  lastName: string;
}

export function ProfessionalDocuments() {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadAttachments = async () => {
    const response = await fetch(`/api/professional/attachments?kind=${AttachmentKind.DOCUMENT}`);
    if (!response.ok) return;
    const data = (await response.json()) as { attachments: AttachmentItem[] };
    setAttachments(data.attachments ?? []);
  };

  useEffect(() => {
    void loadAttachments();
    const loadPatients = async () => {
      const response = await fetch("/api/professional/patients");
      if (!response.ok) return;
      const data = (await response.json()) as { patients: PatientOption[] };
      setPatients(data.patients ?? []);
    };
    void loadPatients();
  }, []);

  const handleUpload = async (file?: File | null, url?: string | null) => {
    setUploadError(null);
    let dataUrl: string | null = null;
    let filename = file?.name ?? url?.split("/").pop() ?? "Document";
    let mimeType = file?.type ?? null;
    let size = file?.size ?? null;

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

    const response = await fetch("/api/professional/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: AttachmentKind.DOCUMENT,
        filename,
        mimeType,
        size,
        url: url?.trim() ?? null,
        dataUrl,
        patientId: selectedPatientId || null,
      }),
    });

    if (response.ok) {
      void loadAttachments();
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Documents</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Document library</h1>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-slate-400" />
          <h2 className="text-lg font-semibold">Upload document</h2>
        </div>
        <div className="mt-4 space-y-2">
          <select
            value={selectedPatientId}
            onChange={(event) => setSelectedPatientId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Select patient (optional)</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} {patient.lastName}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => void handleUpload(event.target.files?.[0], null)}
            className="w-full text-xs text-slate-500"
          />
          <input
            type="url"
            placeholder="Add document link (URL)"
            onBlur={(event) => {
              if (event.target.value.trim()) {
                void handleUpload(null, event.target.value.trim());
                event.target.value = "";
              }
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          {uploadError ? <p className="text-xs text-rose-400">{uploadError}</p> : null}
          <p className="text-[11px] text-slate-400">For production, configure external storage.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-lg font-semibold">Documents</h2>
        <div className="mt-4 space-y-3">
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No documents uploaded yet.</p>
          ) : (
            attachments
              .filter((attachment) => (selectedPatientId ? attachment.patient?.id === selectedPatientId : true))
              .map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{attachment.filename}</p>
                    <p className="text-xs text-slate-500">
                      {attachment.patient ? `${attachment.patient.name} ${attachment.patient.lastName}` : "Sin paciente"}
                    </p>
                  </div>
                  {attachment.url || attachment.dataUrl ? (
                    <a
                      className="text-xs font-semibold text-brand-indigo"
                      href={attachment.url ?? attachment.dataUrl ?? "#"}
                      target="_blank"
                    >
                      View
                    </a>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
