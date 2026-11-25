"use client";

import { formatDocument } from "@/lib/regulatory/colombia";
import { useEffect, useState } from "react";

import { fetchWithRetry } from "@/lib/http";
import { ClinicalHistoryPanel } from "@/app/portal/professional/patients/[id]/ClinicalHistoryPanel";
import { X } from "@/components/ui/Icon";
import { SkeletonRows } from "@/app/portal/components/ui/Skeleton";
import { PortalDialog } from "@/app/portal/components/ui/PortalDialog";

type PatientDetail = {
  id: string;
  patientCode: string | null;
  documentType?: string | null;
  documentId: string | null;
  phone: string | null;
  user: { name: string; lastName: string };
};

export function PatientDetailModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchWithRetry(`/api/admin/patients/${patientId}`)
      .then(async (response) => {
        if (cancelled) return;
        const body = (await response.json().catch(() => null)) as { patient?: PatientDetail; error?: string } | null;
        if (!response.ok || !body?.patient) {
          setError(body?.error ?? "No se pudo cargar la ficha del paciente.");
          setLoading(false);
          return;
        }
        setPatient(body.patient);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("No pudimos conectar con el servidor.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return (
    <PortalDialog onClose={onClose} labelledBy="patient-detail-modal-title" size="full" dismissible className="h-[min(92vh,calc(100dvh-2rem))] open:flex flex-col overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-xl dark:bg-surface-elevated">
      <div className="flex items-start justify-between border-b border-slate-100 p-6 dark:border-surface-muted">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ficha del paciente</p>
          <h3 id="patient-detail-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">
            {loading ? "Cargando..." : patient ? `${patient.user.name} ${patient.user.lastName}` : "Paciente"}
          </h3>
          {patient ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Documento: {formatDocument(patient.documentType, patient.documentId) ?? "Sin documento"} · Teléfono: {patient.phone ?? "Sin teléfono"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-surface-muted"
          aria-label="Cerrar"
        >
          <X aria-hidden="true" className="h-4 w-4" weight="bold" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {loading ? <SkeletonRows label="Cargando historial clínico" /> : null}
        {patient ? <ClinicalHistoryPanel patientId={patient.id} /> : null}
      </div>
    </PortalDialog>
  );
}
