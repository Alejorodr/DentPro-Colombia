"use client";

import { useEffect } from "react";

export interface AppointmentPrintData {
  id: string;
  reason: string;
  serviceName: string | null;
  patient: { patientCode: string | null; user: { name: string; lastName: string; email: string } } | null;
  professional: { user: { name: string } } | null;
  timeSlot: { startAt: Date; endAt: Date };
  clinicalNotes: Array<{ content: string }>;
  prescription: { items: Array<{ id: string; name: string; dosage: string | null; frequency: string | null; instructions: string | null }> } | null;
  attachments: Array<{ id: string; filename: string; url: string | null; dataUrl: string | null }>;
}

interface PrintSummaryProps {
  appointment: AppointmentPrintData;
}

export function PrintSummary({ appointment }: PrintSummaryProps) {
  const latestNote = appointment.clinicalNotes.at(0)?.content ?? "";
  const patientName = appointment.patient
    ? `${appointment.patient.user.name} ${appointment.patient.user.lastName}`
    : "Paciente no disponible";
  const patientCode = appointment.patient?.patientCode ?? "-";
  const patientEmail = appointment.patient?.user.email ?? "Sin correo";
  const professionalName = appointment.professional?.user.name ?? "Profesional no disponible";

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white px-6 py-8 text-slate-900">
      <header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">DentPro Colombia</p>
          <h1 className="text-2xl font-semibold">Clinical Summary</h1>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
        >
          Print
        </button>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase text-slate-400">Patient</h2>
          <p className="mt-2 text-lg font-semibold">
            {patientName}
          </p>
          <p className="text-sm text-slate-500">ID: {patientCode}</p>
          <p className="text-sm text-slate-500">Email: {patientEmail}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase text-slate-400">Appointment</h2>
          <p className="mt-2 text-sm text-slate-600">
            {appointment.timeSlot.startAt.toLocaleString("es-CO")} - {appointment.timeSlot.endAt.toLocaleTimeString("es-CO")}
          </p>
          <p className="text-sm text-slate-600">Service: {appointment.serviceName ?? appointment.reason}</p>
          <p className="text-sm text-slate-600">Professional: {professionalName}</p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase text-slate-400">Procedural Notes</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
          {latestNote || "No clinical notes recorded."}
        </p>
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase text-slate-400">Prescription</h2>
        {appointment.prescription?.items?.length ? (
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {appointment.prescription.items.map((item) => (
              <li key={item.id}>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.dosage ?? ""} {item.frequency ? `· ${item.frequency}` : ""}
                </p>
                {item.instructions ? <p className="text-xs text-slate-500">{item.instructions}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No prescription recorded.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase text-slate-400">Attachments</h2>
        {appointment.attachments.length ? (
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {appointment.attachments.map((attachment) => (
              <li key={attachment.id}>
                <p className="font-semibold">{attachment.filename}</p>
                <p className="text-xs text-slate-500">
                  {attachment.url ?? (attachment.dataUrl ? "Attached data" : "No link")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No attachments.</p>
        )}
      </section>
    </div>
  );
}
