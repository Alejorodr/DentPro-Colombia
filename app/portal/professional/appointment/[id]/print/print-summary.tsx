"use client";

import { useEffect } from "react";

import type { Appointment, Attachment, ClinicalNote, PatientProfile, Prescription, PrescriptionItem, ProfessionalProfile, TimeSlot, User } from "@prisma/client";

interface PrintSummaryProps {
  appointment: Appointment & {
    patient: PatientProfile & { user: User };
    professional: ProfessionalProfile & { user: User };
    timeSlot: TimeSlot;
    clinicalNotes: ClinicalNote[];
    prescription: (Prescription & { items: PrescriptionItem[] }) | null;
    attachments: Attachment[];
  };
}

export function PrintSummary({ appointment }: PrintSummaryProps) {
  const latestNote = appointment.clinicalNotes.at(0)?.content ?? "";

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
            {appointment.patient.user.name} {appointment.patient.user.lastName}
          </p>
          <p className="text-sm text-slate-500">ID: {appointment.patient.patientCode ?? "-"}</p>
          <p className="text-sm text-slate-500">Email: {appointment.patient.user.email}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold uppercase text-slate-400">Appointment</h2>
          <p className="mt-2 text-sm text-slate-600">
            {appointment.timeSlot.startAt.toLocaleString("es-CO")} - {appointment.timeSlot.endAt.toLocaleTimeString("es-CO")}
          </p>
          <p className="text-sm text-slate-600">Service: {appointment.serviceName ?? appointment.reason}</p>
          <p className="text-sm text-slate-600">Professional: {appointment.professional.user.name}</p>
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
