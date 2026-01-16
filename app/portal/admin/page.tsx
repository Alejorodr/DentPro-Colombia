import { PeriodSelector } from "@/app/portal/admin/_components/PeriodSelector";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";
import {
  getAdminKpis,
  getAdminRevenueTrend,
  getAdminTrend,
  getAppointmentsForRange,
  parseRange,
  getStaffOnDuty,
} from "@/app/portal/admin/_data/analytics";
import { requireRole } from "@/lib/auth/require-role";
import { formatInTimeZone, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { KPIStatCard } from "@/app/portal/admin/_components/KPIStatCard";
import { RevenueTrendChart } from "@/app/portal/admin/_components/RevenueTrendChart";
import { StaffOnDutyList } from "@/app/portal/admin/_components/StaffOnDutyList";
import { AppointmentsTable } from "@/app/portal/admin/_components/AppointmentsTable";

function formatTime(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, { hour: "2-digit", minute: "2-digit" });
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);

type AdminPortalPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPortalPage({
  searchParams = Promise.resolve({}),
}: AdminPortalPageProps) {
  await requireRole("ADMINISTRADOR");
  const resolvedSearchParams = await searchParams;
  const range = parseRange(resolvedSearchParams ?? {});
  const timeZone = range.timeZone ?? getAnalyticsTimeZone();
  const [kpis, appointments, trend, revenueTrend, staffOnDuty] = await Promise.all([
    getAdminKpis({ from: range.from, to: range.to }),
    getAppointmentsForRange({ from: range.from, to: range.to, limit: 8 }),
    getAdminTrend({ from: range.from, to: range.to, bucket: range.bucket, timeZone }),
    getAdminRevenueTrend({ from: range.from, to: range.to, bucket: range.bucket, timeZone }),
    getStaffOnDuty(),
  ]);

  const stats = [
    {
      label: "Appointments Today",
      value: `${kpis.totalAppointments}`,
      change: `En ${range.label.toLowerCase()}`,
    },
    {
      label: "Revenue MTD",
      value: formatCurrency(kpis.revenueCents / 100),
      change: "Ingresos del período",
    },
    {
      label: "Active Staff",
      value: `${kpis.activeProfessionals}`,
      change: "Profesionales activos",
    },
    {
      label: "Pending Approvals",
      value: `${kpis.pendingApprovals}`,
      change: "Citas pendientes",
    },
  ];

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
          <KPIStatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RevenueTrendChart
          series={revenueTrend.series.map((value) => value / 100)}
          labels={revenueTrend.labels}
          title="Revenue Trends"
          subtitle="Last 30 Days Performance"
          totalLabel={formatCurrency(revenueTrend.totalCents / 100)}
          deltaLabel={`${trend.series.reduce((acc, value) => acc + value, 0)} citas en el período`}
        />
        <StaffOnDutyList staff={staffOnDuty} />
      </section>

      <AppointmentsTable
        appointments={appointments.map((appointment) => ({
          id: appointment.id,
          patientName: appointment.patientName,
          professionalName: appointment.professionalName,
          serviceName: appointment.serviceName,
          timeLabel: formatTime(appointment.startAt, timeZone),
          status: appointment.status,
        }))}
      />
    </div>
  );
}
