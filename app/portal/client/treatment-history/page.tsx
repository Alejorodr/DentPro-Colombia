import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus, AttachmentKind } from "@prisma/client";
import { formatInTimeZone, getAnalyticsTimeZone } from "@/lib/dates/tz";

const TZ = getAnalyticsTimeZone();

function formatDate(date: Date) {
  return formatInTimeZone(date, TZ, { day: "numeric", month: "long", year: "numeric" });
}

function formatMonthYear(date: Date) {
  return formatInTimeZone(date, TZ, { month: "long", year: "numeric" });
}

function formatTime(date: Date) {
  return formatInTimeZone(date, TZ, { hour: "2-digit", minute: "2-digit" });
}

function groupByMonth<T extends { date: Date }>(items: T[]): Array<{ key: string; label: string; items: T[] }> {
  const map = new Map<string, { label: string; items: T[] }>();
  for (const item of items) {
    const key = formatInTimeZone(item.date, TZ, { year: "numeric", month: "2-digit" });
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, { label: formatMonthYear(item.date), items: [item] });
    }
  }
  return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
}

export default async function ClientTreatmentHistoryPage() {
  const session = await requireRole("PACIENTE");
  const prisma = getPrismaClient();

  const patient = await prisma.patientProfile.findUnique({
    where: { userId: session.user?.id ?? "" },
  });

  if (!patient) {
    return <p className="text-sm text-slate-500">Aún no tienes perfil de paciente.</p>;
  }

  const [appointments, episodes] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: patient.id, status: AppointmentStatus.COMPLETED },
      select: {
        id: true,
        reason: true,
        serviceName: true,
        timeSlot: { select: { startAt: true } },
        professional: {
          select: { user: { select: { name: true, lastName: true } }, specialty: { select: { name: true } } },
        },
        service: { select: { name: true } },
        clinicalNotes: {
          select: { content: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
        prescription: {
          select: {
            items: { select: { name: true, dosage: true, frequency: true, type: true }, orderBy: { id: "asc" } },
          },
        },
        attachments: {
          where: { kind: AttachmentKind.XRAY },
          select: { id: true, filename: true, url: true, dataUrl: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { timeSlot: { startAt: "desc" } },
    }),
    prisma.clinicalEpisode.findMany({
      where: { patientId: patient.id, visibleToPatient: true, deletedAt: null },
      select: {
        id: true,
        date: true,
        reason: true,
        diagnosis: true,
        treatmentPlan: true,
        professional: {
          select: { user: { select: { name: true, lastName: true } }, specialty: { select: { name: true } } },
        },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  type TimelineItem =
    | {
        kind: "appointment";
        id: string;
        date: Date;
        label: string;
        professional: string;
        specialty: string | null;
        note: string | null;
        prescriptionItems: { name: string; dosage: string | null; frequency: string | null }[];
        attachments: { id: string; filename: string; url: string | null; dataUrl: string | null }[];
      }
    | {
        kind: "episode";
        id: string;
        date: Date;
        label: string;
        professional: string;
        specialty: string | null;
        diagnosis: string | null;
        treatmentPlan: string | null;
      };

  const timeline: TimelineItem[] = [
    ...appointments.map((a) => ({
      kind: "appointment" as const,
      id: a.id,
      date: a.timeSlot.startAt,
      label: a.serviceName ?? a.service?.name ?? a.reason,
      professional: `${a.professional.user.name} ${a.professional.user.lastName}`,
      specialty: a.professional.specialty?.name ?? null,
      note: a.clinicalNotes.at(0)?.content ?? null,
      prescriptionItems: a.prescription?.items ?? [],
      attachments: a.attachments,
    })),
    ...episodes.map((e) => ({
      kind: "episode" as const,
      id: e.id,
      date: e.date,
      label: e.reason ?? "Consulta clínica",
      professional: `${e.professional.user.name} ${e.professional.user.lastName}`,
      specialty: e.professional.specialty?.name ?? null,
      diagnosis: e.diagnosis,
      treatmentPlan: e.treatmentPlan,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const lastVisit = timeline[0]?.date ?? null;
  const totalCompleted = appointments.length;
  const monthGroups = groupByMonth(timeline);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
            Portal paciente
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Historial de tratamientos</h1>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-300">
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 dark:border-surface-muted dark:bg-surface-elevated">
            <span className="font-semibold text-slate-900 dark:text-white">{totalCompleted}</span> visitas completadas
          </span>
          {lastVisit && (
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 dark:border-surface-muted dark:bg-surface-elevated">
              Última visita:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{formatDate(lastVisit)}</span>
            </span>
          )}
        </div>
      </header>

      {timeline.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
          <p className="text-base font-semibold text-slate-900 dark:text-white">Sin historial aún</p>
          <p className="mt-2">Tus visitas y tratamientos completados aparecerán aquí.</p>
          <Link
            href="/portal/client/book"
            className="mt-4 inline-flex items-center rounded-full bg-brand-teal px-5 py-2 text-xs font-semibold uppercase text-white"
          >
            Agendar primera cita
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {monthGroups.map((group) => (
            <section key={group.key} className="space-y-4">
              <h2 className="text-sm font-semibold capitalize text-slate-500 dark:text-slate-300">
                {group.label}
              </h2>

              <div className="relative space-y-4 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-slate-200 before:dark:bg-surface-muted">
                {group.items.map((item) => (
                  <article
                    key={`${item.kind}-${item.id}`}
                    className="relative pl-8"
                  >
                    <span className={`absolute left-0 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                      item.kind === "appointment"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                    }`}>
                      {item.kind === "appointment" ? "C" : "E"}
                    </span>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">{item.label}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.professional}
                            {item.specialty ? ` · ${item.specialty}` : ""}
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <p>{formatDate(item.date)}</p>
                          {item.kind === "appointment" && (
                            <p>{formatTime(item.date)}</p>
                          )}
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.kind === "appointment"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                          }`}>
                            {item.kind === "appointment" ? "Cita" : "Episodio clínico"}
                          </span>
                        </div>
                      </div>

                      {item.kind === "appointment" ? (
                        <div className="mt-4 space-y-3">
                          {item.note ? (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-surface-muted/50 dark:bg-surface-base/60">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Notas del profesional
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200">{item.note}</p>
                            </div>
                          ) : null}

                          {item.prescriptionItems.length > 0 ? (
                            <div>
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Prescripción
                              </p>
                              <ul className="space-y-1">
                                {item.prescriptionItems.map((rx, index) => (
                                  <li
                                    key={index}
                                    className="flex flex-wrap items-center gap-x-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-surface-muted/50 dark:bg-surface-base/60"
                                  >
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{rx.name}</span>
                                    {rx.dosage && <span className="text-slate-500">{rx.dosage}</span>}
                                    {rx.frequency && <span className="text-slate-400">{rx.frequency}</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {item.attachments.length > 0 ? (
                            <div>
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Imágenes y radiografías
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {item.attachments.map((att) => {
                                  const href = att.url ?? att.dataUrl;
                                  return href ? (
                                    <Link
                                      key={att.id}
                                      href={href}
                                      target="_blank"
                                      className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-teal hover:bg-slate-50 dark:border-surface-muted dark:bg-surface-elevated dark:hover:bg-surface-muted"
                                    >
                                      {att.filename}
                                    </Link>
                                  ) : (
                                    <span
                                      key={att.id}
                                      className="rounded-2xl border border-slate-200 px-3 py-1.5 text-xs text-slate-400"
                                    >
                                      {att.filename}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {item.diagnosis ? (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-surface-muted/50 dark:bg-surface-base/60">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Diagnóstico
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200">{item.diagnosis}</p>
                            </div>
                          ) : null}
                          {item.treatmentPlan ? (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-surface-muted/50 dark:bg-surface-base/60">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Plan de tratamiento
                              </p>
                              <p className="text-sm text-slate-700 dark:text-slate-200">{item.treatmentPlan}</p>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
