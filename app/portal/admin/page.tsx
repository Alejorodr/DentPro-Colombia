import { CalendarCheck, ClockClockwise, CurrencyDollar, Users } from "@phosphor-icons/react/dist/ssr";

import { requireRole } from "@/lib/auth/require-role";
import { Card } from "@/app/portal/components/ui/Card";
import { ChartSpark } from "@/app/portal/components/ui/ChartSpark";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";
import { StatCard } from "@/app/portal/components/ui/StatCard";
import { Table } from "@/app/portal/components/ui/Table";
import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";

const stats = [
  {
    label: "Citas hoy",
    value: "18",
    change: "+12% vs ayer",
    icon: CalendarCheck,
  },
  {
    label: "Ingresos MTD",
    value: "$14.2M",
    change: "+6% vs mes pasado",
    icon: CurrencyDollar,
  },
  {
    label: "Staff activo",
    value: "12",
    change: "2 en descanso",
    icon: Users,
  },
  {
    label: "Pendientes",
    value: "5",
    change: "-3 en 24h",
    icon: ClockClockwise,
  },
];

const staffOnDuty = [
  { name: "María López", role: "Coordinación" },
  { name: "Dr. Luis Pardo", role: "Implantología" },
  { name: "Dra. Ana Ríos", role: "Ortodoncia" },
  { name: "Carlos Vega", role: "Recepción" },
];

const appointments = [
  { time: "08:30", patient: "Julia Vargas", professional: "Dra. Ana Ríos", status: "Confirmada" },
  { time: "10:00", patient: "Jhon Pérez", professional: "Dr. Luis Pardo", status: "En espera" },
  { time: "11:15", patient: "Valentina Ruiz", professional: "Dra. Andrea Ríos", status: "Confirmada" },
  { time: "13:30", patient: "Samuel Torres", professional: "Dr. Mateo Silva", status: "Pendiente" },
];

export default async function AdminPortalPage() {
  await requireRole("ADMINISTRADOR");

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
                Revenue Trends
              </p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ingresos vs. semanas</h2>
            </div>
            <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
              +8.4% MoM
            </span>
          </div>
          <ChartSpark />
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Staff On Duty</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Equipo activo</h2>
          </div>
          <div className="space-y-3">
            {staffOnDuty.map((member) => (
              <div key={member.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-surface-muted/60">
                <div className="flex items-center gap-3">
                  <AvatarFallback name={member.name} className="h-9 w-9" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{member.role}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Disponible</span>
              </div>
            ))}
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
            4 citas próximas
          </span>
        </div>
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
            {appointments.map((appointment) => (
              <tr key={`${appointment.time}-${appointment.patient}`} className="bg-white dark:bg-surface-elevated/60">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{appointment.time}</td>
                <td className="px-4 py-3">{appointment.patient}</td>
                <td className="px-4 py-3">{appointment.professional}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
                    {appointment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </div>
  );
}
