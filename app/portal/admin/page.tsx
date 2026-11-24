import { Suspense } from "react";

import {
  getAdminKpis,
  getAdminRevenueTrend,
  getAdminTrend,
  getAppointmentsForRange,
  getStaffOnDuty,
  parseRange,
} from "@/app/portal/admin/_data/analytics";
import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";
import { GlassyDashboard, type GlassyDashboardData, type GlassyStatusTone } from "@/components/ui/GlassyDashboard";
import { requireRole } from "@/lib/auth/require-role";
import { formatInTimeZone, getAnalyticsTimeZone } from "@/lib/dates/tz";

const STATUS_TONES: Record<string, GlassyStatusTone> = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  CHECKED_IN: "active",
  COMPLETED: "completed",
  CANCELLED: "closed",
  NO_SHOW: "closed",
};

const FALLBACK_LABELS: Record<string, string> = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  CHECKED_IN: "En consulta",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const statusLabel = (status: string) => STATUS_COLORS[status]?.label ?? FALLBACK_LABELS[status] ?? status;
const toneFor = (status: string): GlassyStatusTone => STATUS_TONES[status] ?? "scheduled";

/** Variación porcentual contra el período anterior; null si no hay base de comparación. */
function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

type AdminPortalPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPortalPage({ searchParams = Promise.resolve({}) }: AdminPortalPageProps) {
  await requireRole("ADMINISTRADOR");
  const range = parseRange((await searchParams) ?? {});
  const timeZone = range.timeZone ?? getAnalyticsTimeZone();

  // Período anterior de igual duración, para calcular las variaciones de las métricas.
  const span = range.to.getTime() - range.from.getTime();
  const previousFrom = new Date(range.from.getTime() - span);

  const [kpis, previousKpis, trend, revenueTrend, appointments, staffOnDuty] = await Promise.all([
    getAdminKpis({ from: range.from, to: range.to }),
    getAdminKpis({ from: previousFrom, to: range.from }),
    getAdminTrend({ from: range.from, to: range.to, bucket: range.bucket, timeZone }),
    getAdminRevenueTrend({ from: range.from, to: range.to, bucket: range.bucket, timeZone }),
    getAppointmentsForRange({ from: range.from, to: range.to, limit: 120 }),
    getStaffOnDuty(),
  ]);

  const data: GlassyDashboardData = {
    rangeKey: range.rangeKey,
    rangeLabel: range.label,
    fromInput: range.fromInput,
    toInput: range.toInput,
    kpis: {
      revenue: kpis.revenueCents / 100,
      revenueDelta: percentChange(kpis.revenueCents, previousKpis.revenueCents),
      appointments: kpis.totalAppointments,
      appointmentsDelta: percentChange(kpis.totalAppointments, previousKpis.totalAppointments),
      newPatients: kpis.newPatients,
      newPatientsDelta: percentChange(kpis.newPatients, previousKpis.newPatients),
      cancellations: kpis.cancellations,
      cancellationsDelta: percentChange(kpis.cancellations, previousKpis.cancellations),
      utilization: kpis.utilizationRate * 100,
      bookedSlots: kpis.bookedSlots,
      totalSlots: kpis.totalSlots,
      pending: kpis.pendingApprovals,
      activeProfessionals: kpis.activeProfessionals,
    },
    trend: {
      labels: revenueTrend.labels,
      revenue: revenueTrend.series.map((cents) => cents / 100),
      appointments: trend.series,
    },
    statusMix: Object.entries(kpis.statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, label: statusLabel(status), tone: toneFor(status), count })),
    appointments: appointments.map((appointment) => ({
      id: appointment.id,
      patient: appointment.patientName ?? "Paciente sin nombre",
      professional: appointment.professionalName ?? "Sin asignar",
      service: appointment.serviceName ?? "Consulta general",
      dateLabel: formatInTimeZone(appointment.startAt, timeZone, { weekday: "short", day: "numeric", month: "short" }),
      timeLabel: formatInTimeZone(appointment.startAt, timeZone, { hour: "numeric", minute: "2-digit" }),
      status: appointment.status,
      statusLabel: statusLabel(appointment.status),
      tone: toneFor(appointment.status),
    })),
    staff: staffOnDuty,
  };

  return (
    <Suspense>
      <GlassyDashboard data={data} />
    </Suspense>
  );
}
