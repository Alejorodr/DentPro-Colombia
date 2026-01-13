import { CalendarCheck, ChartDonut, UserCheck, Users } from "@phosphor-icons/react/dist/ssr";

import { requireRole } from "@/lib/auth/require-role";
import Link from "next/link";

import { PeriodSelector } from "@/app/portal/admin/_components/PeriodSelector";
import { Card } from "@/app/portal/components/ui/Card";
import { ChartSpark } from "@/app/portal/components/ui/ChartSpark";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";
import { StatCard } from "@/app/portal/components/ui/StatCard";
import { Table } from "@/app/portal/components/ui/Table";
import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
import {
  getAdminKpis,
  getAdminTrend,
  getAppointmentsForRange,
  parseRange,
} from "@/app/portal/admin/_data/analytics";
import { getStaffList } from "@/app/portal/admin/_data/dashboard";
import { AppointmentStatus } from "@prisma/client";

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-CO", { month: "short", day: "2-digit" });
}

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: "Pendientes",
  CONFIRMED: "Confirmadas",
  CANCELLED: "Canceladas",
  COMPLETED: "Completadas",
};

type AdminPortalPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPortalPage({
  searchParams = Promise.resolve({}),
}: AdminPortalPageProps) {
  await requireRole("ADMINISTRADOR");
  const resolvedSearchParams = await searchParams;
  const range = parseRange(resolvedSearchParams ?? {});
  const [kpis, staffOnDuty, appointments, trend] = await Promise.all([
    getAdminKpis({ from: range.from, to: range.to }),
    getStaffList(),
    getAppointmentsForRange({ from: range.from, to: range.to, limit: 8 }),
    getAdminTrend({ from: range.from, to: range.to, bucket: range.bucket }),
  ]);

  const stats = [
    {
      label: "Citas en período",
      value: `${kpis.totalAppointments}`,
      change: range.label,
      icon: CalendarCheck,
    },
    {
      label: "Pacientes nuevos",
      value: `${kpis.newPatients}`,
      change: "Registros en período",
      icon: Users,
    },
    {
      label: "Profesionales activos",
      value: `${kpis.activeProfessionals}`,
      change: "Con citas en período",
      icon: UserCheck,
    },
    {
      label: "Ocupación agenda",
      value: `${Math.round(kpis.utilizationRate * 100)}%`,
      change:
        kpis.totalSlots > 0
          ? `${kpis.bookedSlots}/${kpis.totalSlots} slots ocupados`
          : "Sin slots en el período",
      icon: ChartDonut,
    },
  ];

  const statusEntries = Object.values(AppointmentStatus).map((status) => ({
    status,
    label: statusLabels[status],
    count: kpis.statusCounts[status],
  }));

  const cancellationRate =
    kpis.totalAppointments > 0
      ? Math.round((kpis.statusCounts.CANCELLED / kpis.totalAppointments) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Portal Administrador"
        title="Gestión general"
        description="Monitorea las métricas clave por período y actúa rápido sobre operaciones."
      />

      <PeriodSelector rangeKey={range.rangeKey} fromInput={range.fromInput} toInput={range.toInput} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tendencias
              </p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{trend.metricLabel}</h2>
            </div>
            <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
              {range.label}
            </span>
          </div>
          <ChartSpark
            series={trend.series}
            labels={trend.labels}
            ariaLabel={`Tendencia de ${trend.metricLabel.toLowerCase()}`}
          />
          {trend.series.every((value) => value === 0) ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aún no hay citas registradas en este período.
            </p>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Estado de citas
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Distribución del período</h2>
          </div>
          <div className="space-y-3">
            {statusEntries.map((entry) => (
              <div
                key={entry.status}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-surface-muted/60 dark:text-slate-200"
              >
                <span>{entry.label}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{entry.count}</span>
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500 dark:border-surface-muted/70 dark:text-slate-400">
              Tasa de cancelación:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{cancellationRate}%</span>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Agenda del período
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resumen de citas</h2>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-surface-muted dark:text-slate-300">
            {kpis.totalAppointments} citas en período
          </span>
        </div>
        {appointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:bg-surface-elevated/80 dark:text-slate-300">
            No hay citas registradas en este período.{" "}
            <Link href="/portal/admin/appointments" className="font-medium text-brand-teal dark:text-accent-cyan">
              Crear cita
            </Link>{" "}
            para completar la agenda.
          </div>
        ) : (
          <div className="space-y-3">
            <Table>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Hora</th>
                  <th className="px-4 py-3 font-semibold">Paciente</th>
                  <th className="px-4 py-3 font-semibold">Profesional</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="bg-white dark:bg-surface-elevated/60">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {formatDate(appointment.timeSlot.startAt)}
                    </td>
                    <td className="px-4 py-3">{formatTime(appointment.timeSlot.startAt)}</td>
                    <td className="px-4 py-3">
                      {appointment.patient?.user.name ?? "—"} {appointment.patient?.user.lastName ?? ""}
                    </td>
                    <td className="px-4 py-3">
                      {appointment.professional?.user.name ?? "—"} {appointment.professional?.user.lastName ?? ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {kpis.totalAppointments > appointments.length ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando {appointments.length} de {kpis.totalAppointments} citas.{" "}
                <Link href="/portal/admin/appointments" className="font-semibold text-brand-teal dark:text-accent-cyan">
                  Ver todas
                </Link>
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Staff On Duty</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Equipo activo</h2>
          </div>
          <div className="space-y-3">
            {staffOnDuty.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:text-slate-400">
                No hay staff activo aún.{" "}
                <Link href="/portal/admin/users" className="font-medium text-brand-teal dark:text-accent-cyan">
                  Crear usuario
                </Link>{" "}
                o{" "}
                <Link href="/portal/admin/professionals" className="font-medium text-brand-teal dark:text-accent-cyan">
                  crear profesional
                </Link>{" "}
                para iniciar.
              </div>
            ) : (
              staffOnDuty.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-surface-muted/60"
                >
                  <div className="flex items-center gap-3">
                    <AvatarFallback name={member.name} className="h-9 w-9" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{member.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Disponible</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
