import { requireRole } from "@/lib/auth/require-role";
import { getProfessionalProfile, professionalHasPatientAccess } from "@/lib/clinical/access";
import { getPrismaClient } from "@/lib/prisma";

import { ClinicalHistoryPanel } from "@/app/portal/professional/patients/[id]/ClinicalHistoryPanel";

export default async function ProfessionalPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("PROFESIONAL");
  const { id } = await params;
  const prisma = getPrismaClient();

  const patient = await prisma.patientProfile.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!patient) {
    return <p className="text-sm text-slate-500">Paciente no encontrado.</p>;
  }

  const professional = await getProfessionalProfile(prisma, session.user?.id ?? "");
  const allowed = professional
    ? await professionalHasPatientAccess(prisma, professional, patient.id)
    : false;

  if (!allowed) {
    return <p className="text-sm text-slate-500">No tienes permisos para ver este paciente.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ficha del paciente</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {patient.user.name} {patient.user.lastName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-300">ID: {patient.patientCode ?? patient.id}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <p>Documento: {patient.documentId ?? "Sin documento"}</p>
            <p>Contacto: {patient.phone ?? "Sin teléfono"}</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Historia clínica</p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Episodios clínicos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Registra motivo, diagnóstico, plan y notas de evolución para mantener la trazabilidad.
          </p>
        </div>
        <div className="mt-6">
          <ClinicalHistoryPanel patientId={patient.id} />
        </div>
      </section>
    </div>
  );
}
