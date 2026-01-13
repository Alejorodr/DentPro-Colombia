import { CalendarCheck, ClockClockwise, CurrencyDollar, Users } from "@phosphor-icons/react/dist/ssr";

import { requireRole } from "@/lib/auth/require-role";
import Link from "next/link";

import { Card } from "@/app/portal/components/ui/Card";
import { ChartSpark } from "@/app/portal/components/ui/ChartSpark";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";
import { StatCard } from "@/app/portal/components/ui/StatCard";
import { Table } from "@/app/portal/components/ui/Table";
import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
import {
  getAdminDashboardSummary,
  getStaffList,
  getTodayAppointments,
  getTrendSeries,
} from "@/app/portal/admin/_data/dashboard";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export default async function AdminPortalPage() {
  await requireRole("ADMINISTRADOR");
  const [summary, staffOnDuty, todayAppointments, trend] = await Promise.all([
    getAdminDashboardSummary(),
    getStaffList(),
    getTodayAppointments(),
    getTrendSeries(),
  ]);

  const stats = [
    {
      label: "Citas hoy",
      value: `${summary.appointmentsToday}`,
      change: "Agenda del día",
      icon: CalendarCheck,
    },
    {
      label: "Ingresos MTD",
      value: currencyFormatter.format(summary.revenueMTD),
      change: summary.revenueNote,
      icon: CurrencyDollar,
    },
    {
      label: "Staff activo",
      value: `${summary.staffCount}`,
      change: "Disponibles ahora",
      icon: Users,
    },
    {
      label: "Pendientes",
      value: `${summary.pendingAppointments}`,
      change: "Citas en espera",
      icon: ClockClockwise,
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Portal Administrador"
        title="Gestión general"
        description="Monitorea las métricas clave y actúa rápido sobre operaciones del día."
      />

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
              Últimas 6 semanas
            </span>
          </div>
          <ChartSpark
            series={trend.series}
            labels={trend.labels}
            ariaLabel={`Tendencia de ${trend.metricLabel.toLowerCase()}`}
          />
        </Card>

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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Today&apos;s Appointments
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Agenda del día</h2>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-surface-muted dark:text-slate-300">
            {todayAppointments.length} citas próximas
          </span>
        </div>
        {todayAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:bg-surface-elevated/80 dark:text-slate-300">
            No hay citas para hoy.{" "}
            <Link href="/portal/admin/appointments" className="font-medium text-brand-teal dark:text-accent-cyan">
              Crear cita
            </Link>{" "}
            para completar la agenda.
          </div>
        ) : (
          <Table>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Hora</th>
                <th className="px-4 py-3 font-semibold">Paciente</th>
                <th className="px-4 py-3 font-semibold">Profesional</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
              {todayAppointments.map((appointment) => (
                <tr key={appointment.id} className="bg-white dark:bg-surface-elevated/60">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {formatTime(appointment.timeSlot.startAt)}
                  </td>
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
        )}
      </section>
    </div>
  );
}
