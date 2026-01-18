import { headers } from "next/headers";

import { requireRole } from "@/lib/auth/require-role";
import { getProfessionalProfile } from "@/lib/clinical/access";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getPrismaClient } from "@/lib/prisma";
import { AccessLogAction } from "@prisma/client";

export default async function EpisodePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("PROFESIONAL");
  const { id } = await params;
  const prisma = getPrismaClient();
  const professional = await getProfessionalProfile(prisma, session.user?.id ?? "");

  if (!professional) {
    return <p className="text-sm text-slate-500">Profesional no encontrado.</p>;
  }

  const episode = await prisma.clinicalEpisode.findFirst({
    where: { id, deletedAt: null },
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true } },
    },
  });

  const quoteTemplate = await prisma.clinicDocumentTemplate.findFirst({
    where: { type: "QUOTE", active: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!episode || episode.professionalId !== professional.id) {
    return <p className="text-sm text-slate-500">Episodio no encontrado.</p>;
  }

  const requestHeaders = await headers();
  const requestId =
    requestHeaders.get("x-request-id") ?? requestHeaders.get("x-vercel-id") ?? crypto.randomUUID();

  await logClinicalAccess({
    userId: session.user?.id ?? "",
    patientId: episode.patientId,
    action: AccessLogAction.EXPORT,
    route: `/portal/professional/episode/${id}/print`,
    requestId,
    metadata: { episodeId: episode.id },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white px-8 py-10 text-slate-900 print:bg-white">
      <header className="space-y-2 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Resumen de episodio clínico</h1>
        <p className="text-sm text-slate-500">DentPro Colombia · Historia clínica</p>
      </header>

      <section className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Paciente</p>
          <p className="font-semibold">
            {episode.patient.user.name} {episode.patient.user.lastName}
          </p>
          <p className="text-slate-500">ID: {episode.patient.patientCode ?? episode.patient.id}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Profesional</p>
          <p className="font-semibold">
            {episode.professional.user.name} {episode.professional.user.lastName}
          </p>
          <p className="text-slate-500">Fecha: {episode.date.toLocaleDateString("es-CO")}</p>
        </div>
      </section>

      <section className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Motivo</p>
          <p>{episode.reason ?? "Consulta clínica"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Diagnóstico</p>
          <p>{episode.diagnosis ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Plan de tratamiento</p>
          <p>{episode.treatmentPlan ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Notas clínicas</p>
          <p>{episode.notes ?? "—"}</p>
        </div>
        {quoteTemplate ? (
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase text-slate-400">{quoteTemplate.title}</p>
            <div
              className="prose prose-sm mt-2 max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: quoteTemplate.contentHtml }}
            />
          </div>
        ) : null}
      </section>

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Documento generado desde DentPro. Este resumen no sustituye la historia clínica completa.
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
