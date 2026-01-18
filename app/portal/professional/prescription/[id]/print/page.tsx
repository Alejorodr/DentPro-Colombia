import { headers } from "next/headers";

import { requireRole } from "@/lib/auth/require-role";
import { getProfessionalProfile } from "@/lib/clinical/access";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getPrismaClient } from "@/lib/prisma";
import { AccessLogAction } from "@prisma/client";

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("PROFESIONAL");
  const { id } = await params;
  const prisma = getPrismaClient();
  const professional = await getProfessionalProfile(prisma, session.user?.id ?? "");

  if (!professional) {
    return <p className="text-sm text-slate-500">Profesional no encontrado.</p>;
  }

  const prescription = await prisma.prescription.findFirst({
    where: { id, deletedAt: null },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true } },
      episode: true,
    },
  });

  if (!prescription || prescription.professionalId !== professional.id) {
    return <p className="text-sm text-slate-500">Receta no encontrada.</p>;
  }

  const requestHeaders = await headers();
  const requestId =
    requestHeaders.get("x-request-id") ?? requestHeaders.get("x-vercel-id") ?? crypto.randomUUID();

  await logClinicalAccess({
    userId: session.user?.id ?? "",
    patientId: prescription.patientId,
    action: AccessLogAction.EXPORT,
    route: `/portal/professional/prescription/${id}/print`,
    requestId,
    metadata: { prescriptionId: prescription.id },
  });

  const contentText =
    typeof prescription.content === "object" && prescription.content && "text" in prescription.content
      ? String(prescription.content.text ?? "")
      : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white px-8 py-10 text-slate-900 print:bg-white">
      <header className="space-y-2 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Receta clínica</h1>
        <p className="text-sm text-slate-500">DentPro Colombia · Prescripción</p>
      </header>

      <section className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Paciente</p>
          <p className="font-semibold">
            {prescription.patient?.user.name} {prescription.patient?.user.lastName}
          </p>
          <p className="text-slate-500">ID: {prescription.patient?.patientCode ?? prescription.patientId}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Profesional</p>
          <p className="font-semibold">
            {prescription.professional?.user.name} {prescription.professional?.user.lastName}
          </p>
          <p className="text-slate-500">
            Emitida: {(prescription.issuedAt ?? prescription.createdAt).toLocaleDateString("es-CO")}
          </p>
        </div>
      </section>

      <section className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Indicaciones</p>
          <p>{contentText || "Sin detalles adicionales."}</p>
        </div>
        {prescription.episode ? (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Episodio clínico</p>
            <p>{prescription.episode.reason ?? "Consulta clínica"}</p>
          </div>
        ) : null}
      </section>

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Documento generado desde DentPro. Verifica dosis e indicaciones antes de entregar.
      </footer>

      <style>{`
        @media print {
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
