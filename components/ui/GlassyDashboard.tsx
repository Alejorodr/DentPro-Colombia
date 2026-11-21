"use client";

/**
 * GlassyDashboard — Inicio del portal administrador con estética "glassy".
 *
 * Basado en el componente glassy-dashboard (21st.dev), adaptado a DentPro (CLAUDE.md):
 * - Vive dentro del escenario de vidrio de `AdminGlassShell`; los tokens y estilos están en
 *   `glassy-dashboard.css` (paleta azul-doble, Outfit + Inter, modo `.dark`).
 * - Cuatro vistas (Resumen, Tendencias, Métricas, Operaciones) sincronizadas con el hash y
 *   un dock inferior con indicador deslizante para cambiar entre ellas.
 * - Animaciones en CSS + requestAnimationFrame (sin GSAP), respetando prefers-reduced-motion.
 * - Datos reales del servidor (COP, es-CO). Iconos desde `@/components/ui/Icon`.
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";

import "@/components/ui/glassy-dashboard.css";

import { GlassyDock } from "@/components/ui/GlassyDock";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarCheck,
  CaretRight,
  ChartLineUp,
  CheckCircle,
  Clock,
  CreditCard,
  FileArrowUp,
  Funnel,
  MagnifyingGlass,
  SquaresFour,
  TrendUp,
  Users,
  X,
  XCircle,
  type Icon as IconComponent,
} from "@/components/ui/Icon";

/* ───────────────────────────── Tipos públicos ───────────────────────────── */

export type GlassyStatusTone = "scheduled" | "confirmed" | "active" | "completed" | "closed";

export type GlassyAppointment = {
  id: string;
  patient: string;
  professional: string;
  service: string;
  dateLabel: string;
  timeLabel: string;
  status: string;
  statusLabel: string;
  tone: GlassyStatusTone;
};

export type GlassyStaffMember = {
  id: string;
  name: string;
  subtitle: string;
  status: "available" | "busy" | "off";
};

export type GlassyDashboardData = {
  rangeKey: string;
  rangeLabel: string;
  fromInput: string;
  toInput: string;
  kpis: {
    revenue: number;
    revenueDelta: number | null;
    appointments: number;
    appointmentsDelta: number | null;
    newPatients: number;
    newPatientsDelta: number | null;
    cancellations: number;
    cancellationsDelta: number | null;
    utilization: number; // 0–100
    bookedSlots: number;
    totalSlots: number;
    pending: number;
    activeProfessionals: number;
  };
  trend: { labels: string[]; revenue: number[]; appointments: number[] };
  statusMix: { status: string; label: string; tone: GlassyStatusTone; count: number }[];
  appointments: GlassyAppointment[];
  staff: GlassyStaffMember[];
};

export type GlassyDashboardProps = {
  data: GlassyDashboardData;
  /** Enlace a la gestión detallada de citas. */
  appointmentsHref?: string;
  /** Enlace al listado completo del equipo. */
  staffHref?: string;
};

/* ───────────────────────────── Formato ───────────────────────────── */

const integer = new Intl.NumberFormat("es-CO");
const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format;
const copCompact = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
}).format;

type CountFormat = "number" | "cop" | "compact" | "percent";
const formatCount: Record<CountFormat, (value: number) => string> = {
  number: (value) => integer.format(Math.round(value)),
  cop,
  compact: copCompact,
  percent: (value) => `${value.toFixed(1).replace(".", ",")} %`,
};

/* ───────────────────────────── Hooks ───────────────────────────── */

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(callback: () => void) {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

function useCountUp(value: number, duration = 750) {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimated(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);
  return reduced ? value : animated;
}

const VIEW_IDS = ["resumen", "tendencias", "metricas", "operaciones"] as const;
type View = (typeof VIEW_IDS)[number];
const isView = (value: string): value is View => (VIEW_IDS as readonly string[]).includes(value);

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
function useHashView(): [View, (next: View) => void] {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
  const view = isView(hash) ? hash : "resumen";
  const select = (next: View) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next;
  };
  return [view, select];
}

/* ───────────────────────────── Piezas ───────────────────────────── */

function Counter({ value, format = "number" }: { value: number; format?: CountFormat }) {
  const animated = useCountUp(value);
  const text = formatCount[format](value);
  return (
    <>
      <span aria-hidden="true">{formatCount[format](animated)}</span>
      <span className="gd-sr">{text}</span>
    </>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) return null;
  const down = value < 0;
  const label = `${down ? "−" : "+"}${Math.abs(value).toFixed(1).replace(".", ",")} %`;
  return (
    <span className="gd-delta" data-direction={down ? "down" : "up"}>
      {down ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />}
      {label}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  action,
  className = "",
  index = 0,
  testId,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  index?: number;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <section className={`gd-panel ${className}`} data-gd-enter data-testid={testId} style={{ "--gd-i": index } as CSSProperties}>
      <header className="gd-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Metric({
  title,
  icon: Icon,
  value,
  format,
  delta,
  detail,
  highlight,
  index = 0,
  testId,
}: {
  title: string;
  icon: IconComponent;
  value: number;
  format?: CountFormat;
  delta?: number | null;
  detail?: string;
  highlight?: boolean;
  index?: number;
  testId?: string;
}) {
  return (
    <article className="gd-metric" data-highlight={highlight} data-gd-enter data-testid={testId} style={{ "--gd-i": index } as CSSProperties}>
      <div className="gd-metric-head">
        <span>{title}</span>
        <span className="gd-metric-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
      </div>
      <strong className="gd-metric-value">
        <Counter value={value} format={format} />
      </strong>
      <div className="gd-caption">
        {delta !== undefined && <Delta value={delta} />}
        <span>{detail ?? "vs. período anterior"}</span>
      </div>
    </article>
  );
}

function Badge({ label, tone }: { label: string; tone: GlassyStatusTone }) {
  return (
    <span className="gd-status" data-tone={tone}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}

function BarChart({
  labels,
  values,
  format,
  title,
}: {
  labels: string[];
  values: number[];
  format: (value: number) => string;
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...values) * 1.1;
  if (values.length === 0) return <p className="gd-empty">No hay citas en este período.</p>;
  return (
    <figure aria-label={title}>
      <div className="gd-bars-meta">
        <div className="gd-legend">
          <span data-tone="volume">
            <i aria-hidden="true" />
            {title}
          </span>
        </div>
        {active !== null && (
          <span className="gd-readout">
            {labels[active]} · {format(values[active] ?? 0)}
          </span>
        )}
      </div>
      <div className="gd-bars" style={{ "--gd-count": Math.max(1, values.length) } as CSSProperties} onMouseLeave={() => setActive(null)}>
        {values.map((value, index) => (
          <button
            type="button"
            className="gd-bar-col"
            key={`${labels[index]}-${index}`}
            aria-label={`${labels[index]}: ${format(value)}`}
            aria-pressed={active === index}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            onMouseEnter={() => setActive(index)}
            onClick={() => setActive(index)}
          >
            <span className="gd-bar-track" aria-hidden="true">
              <span className="gd-bar" style={{ height: `${(value / max) * 100}%`, animationDelay: `${170 + index * 34}ms` }} />
            </span>
            <span className="gd-bar-label" aria-hidden="true">
              {labels[index]}
            </span>
          </button>
        ))}
      </div>
    </figure>
  );
}

type Point = [number, number];
function curve(points: Point[]) {
  return points.reduce((path, [x, y], index) => {
    if (index === 0) return `M ${x} ${y}`;
    const [px, py] = points[index - 1];
    const mid = (x + px) / 2;
    return `${path} C ${mid} ${py}, ${mid} ${y}, ${x} ${y}`;
  }, "");
}

/** Ingresos (línea sólida, eje izquierdo) y citas (línea punteada, escala propia). */
function RevenueChart({ labels, revenue, appointments }: { labels: string[]; revenue: number[]; appointments: number[] }) {
  const fillId = `gd-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const height = 214;
  const width = 600;
  const max = Math.max(1, ...revenue) * 1.14;
  const maxCount = Math.max(1, ...appointments) * 1.14;
  const toPoints = (values: number[], top: number): Point[] =>
    values.map((value, index) => [(index * width) / Math.max(1, values.length - 1), height - (value / top) * height]);
  const points = toPoints(revenue, max);
  const countPoints = toPoints(appointments, maxCount);
  const line = curve(points);
  const lastX = points.at(-1)?.[0] ?? 0;
  const point = active === null ? undefined : points[active];
  const countPoint = active === null ? undefined : countPoints[active];
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const step = Math.max(1, Math.ceil(labels.length / 8));

  if (revenue.length === 0 || (revenue.every((value) => value === 0) && appointments.every((value) => value === 0))) {
    return <p className="gd-empty">No hay ingresos ni citas registrados en este período.</p>;
  }

  return (
    <figure aria-label="Ingresos y citas por intervalo">
      <div className="gd-line-main">
        <div className="gd-y" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span key={index}>{tick === 0 ? "0" : copCompact(tick)}</span>
          ))}
        </div>
        <div className="gd-plot" onMouseLeave={() => setActive(null)}>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--gd-accent)" stopOpacity=".3" />
                <stop offset="1" stopColor="var(--gd-accent)" stopOpacity=".02" />
              </linearGradient>
            </defs>
            {ticks.map((_, index) => (
              <line className="gd-grid-line" key={index} x1="0" x2={width} y1={(height * index) / 4} y2={(height * index) / 4} />
            ))}
            <g className="gd-reveal">
              <path d={`${line} L ${lastX} ${height} H 0 Z`} fill={`url(#${fillId})`} />
              <path className="gd-path" data-tone="revenue" d={line} />
              {appointments.length === revenue.length && <path className="gd-path" data-tone="volume" d={curve(countPoints)} />}
            </g>
            {point && (
              <g>
                <line className="gd-cursor" x1={point[0]} x2={point[0]} y1="0" y2={height} />
                <circle cx={point[0]} cy={point[1]} r="4.5" fill="var(--gd-accent)" />
                {countPoint && <circle cx={countPoint[0]} cy={countPoint[1]} r="3.5" fill="var(--gd-strong)" />}
              </g>
            )}
          </svg>
          <div className="gd-zones">
            {labels.map((label, index) => (
              <button
                type="button"
                key={`${label}-${index}`}
                aria-label={`${label}: ingresos ${cop(revenue[index] ?? 0)}, ${appointments[index] ?? 0} citas`}
                aria-pressed={active === index}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(index)}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
          {active !== null && (
            <div className="gd-tooltip" style={{ "--gd-x": `${(active / Math.max(1, labels.length - 1)) * 100}%` } as CSSProperties}>
              <strong>{labels[active]}</strong>
              <span>
                Ingresos <b>{cop(revenue[active] ?? 0)}</b>
              </span>
              <span>
                Citas <b>{integer.format(appointments[active] ?? 0)}</b>
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="gd-axis" aria-hidden="true">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`} style={{ visibility: index % step === 0 || index === labels.length - 1 ? undefined : "hidden" }}>
            {label}
          </span>
        ))}
      </div>
    </figure>
  );
}

function StatusRing({ mix }: { mix: GlassyDashboardData["statusMix"] }) {
  const maskId = `gd-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const total = mix.reduce((sum, item) => sum + item.count, 0);
  const ratios = mix.map((item) => (total > 0 ? (item.count / total) * 100 : 0));
  if (total === 0) return <p className="gd-empty">Sin citas en este período.</p>;
  return (
    <div className="gd-ring-wrap" aria-label="Citas por estado">
      <div className="gd-ring">
        <svg viewBox="0 0 124 124" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <circle className="gd-ring-draw" cx="62" cy="62" r="47" fill="none" stroke="white" strokeWidth="15" pathLength="100" strokeDasharray="100 0" transform="rotate(-90 62 62)" />
            </mask>
          </defs>
          <circle cx="62" cy="62" r="47" fill="none" stroke="var(--gd-track)" strokeWidth="14" />
          <g mask={`url(#${maskId})`} transform="rotate(-90 62 62)">
            {mix.map((item, index) => (
              <circle
                key={item.status}
                cx="62"
                cy="62"
                r="47"
                pathLength="100"
                fill="none"
                strokeWidth="14"
                data-tone={item.tone}
                className="gd-ring-seg"
                data-muted={active !== null && index !== active}
                strokeDasharray={`${Math.max(0, ratios[index] - (ratios[index] > 2 ? 1 : 0))} 100`}
                strokeDashoffset={-ratios.slice(0, index).reduce((sum, value) => sum + value, 0)}
              />
            ))}
          </g>
        </svg>
        <div className="gd-ring-total">
          <strong>{active === null ? <Counter value={total} /> : integer.format(mix[active].count)}</strong>
          <span>{active === null ? "Citas" : mix[active].label}</span>
        </div>
      </div>
      <div className="gd-mix">
        {mix.map((item, index) => (
          <button
            type="button"
            key={item.status}
            aria-pressed={active === index}
            aria-label={`${item.label}: ${item.count} citas (${Math.round(ratios[index])} %)`}
            onClick={() => setActive(active === index ? null : index)}
          >
            <span data-tone={item.tone}>
              <i aria-hidden="true" />
              {item.label}
            </span>
            <span className="gd-track" aria-hidden="true">
              <i className="gd-fill" data-tone={item.tone} style={{ width: `${ratios[index]}%` }} />
            </span>
            <strong>{Math.round(ratios[index])} %</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

const PRESENCE_LABELS: Record<GlassyStaffMember["status"], string> = {
  available: "Disponible",
  busy: "Ocupado",
  off: "Fuera",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return `${parts[0][0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

function StaffPanel({ staff, href, index }: { staff: GlassyStaffMember[]; href: string; index: number }) {
  return (
    <Panel
      title="Equipo activo"
      subtitle="Turno de hoy"
      index={index}
      className="gd-staff"
      action={
        <Link className="gd-link" href={href}>
          Ver todos
        </Link>
      }
    >
      {staff.length === 0 ? (
        <p className="gd-empty">No hay profesionales con turno activo.</p>
      ) : (
        <ul>
          {staff.slice(0, 5).map((member) => (
            <li key={member.id}>
              <span className="gd-avatar" aria-hidden="true">
                {initials(member.name)}
              </span>
              <span className="gd-staff-text">
                <strong>{member.name}</strong>
                <small>{member.subtitle}</small>
              </span>
              <span className="gd-presence" data-status={member.status}>
                <i aria-hidden="true" />
                {PRESENCE_LABELS[member.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AppointmentsPanel({
  appointments,
  inspect,
  index = 0,
  appointmentsHref,
}: {
  appointments: GlassyAppointment[];
  inspect: (item: GlassyAppointment) => void;
  index?: number;
  appointmentsHref: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const statuses = Array.from(new Map(appointments.map((item) => [item.status, item.statusLabel])).entries());
  const term = query.trim().toLowerCase();
  const rows = appointments.filter(
    (item) =>
      [item.patient, item.professional, item.service, item.statusLabel].join(" ").toLowerCase().includes(term) &&
      (status === "ALL" || item.status === status),
  );
  return (
    <Panel
      title="Citas del período"
      subtitle={`${integer.format(rows.length)} de ${integer.format(appointments.length)} · abre una cita para ver el detalle`}
      className="gd-wide"
      index={index}
      action={
        <div className="gd-table-tools">
          <label className="gd-search">
            <MagnifyingGlass size={14} aria-hidden="true" />
            <input type="search" placeholder="Buscar paciente, profesional o servicio" aria-label="Buscar cita" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="gd-filter">
            <Funnel size={14} aria-hidden="true" />
            <select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">Todos los estados</option>
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Link className="gd-link" href={appointmentsHref}>
            Ver agenda
          </Link>
        </div>
      }
    >
      <div className="gd-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Paciente</th>
              <th scope="col">Servicio</th>
              <th scope="col">Profesional</th>
              <th scope="col">Estado</th>
              <th scope="col">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((item) => (
              <tr key={item.id} onClick={() => inspect(item)}>
                <td>
                  <button
                    type="button"
                    style={{ all: "unset", cursor: "pointer" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      inspect(item);
                    }}
                  >
                    {item.patient}
                  </button>
                </td>
                <td>{item.service}</td>
                <td>{item.professional}</td>
                <td>
                  <Badge label={item.statusLabel} tone={item.tone} />
                </td>
                <td>
                  {item.dateLabel} · {item.timeLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="gd-empty" role="status">
          No hay citas que coincidan.
        </p>
      )}
    </Panel>
  );
}

/* ───────────────────────────── Vistas ───────────────────────────── */

type ViewProps = {
  data: GlassyDashboardData;
  open: (view: View) => void;
  inspect: (item: GlassyAppointment) => void;
  appointmentsHref: string;
  staffHref: string;
};

function SummaryView({ data, open, inspect, appointmentsHref, staffHref }: ViewProps) {
  const { kpis, trend } = data;
  const avgTicket = kpis.appointments > 0 ? kpis.revenue / kpis.appointments : 0;
  return (
    <div className="gd-command-grid">
      <Panel title="Ingresos del período" action={<span className="gd-unit">COP</span>} index={0} testId="admin-kpi-revenue">
        <div className="gd-balance-number">
          <Counter value={kpis.revenue} format="cop" />
        </div>
        <div className="gd-caption" style={{ marginTop: 8 }}>
          <Delta value={kpis.revenueDelta} />
          <span>Acumulado en {data.rangeLabel.toLowerCase()}</span>
        </div>
        <div className="gd-balance-actions">
          <button type="button" className="gd-primary" onClick={() => open("tendencias")}>
            Ver tendencias <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className="gd-secondary" onClick={() => open("metricas")}>
            Ver métricas
          </button>
        </div>
        <div className="gd-streams" aria-label="Desglose de ingresos">
          <div>
            <span>Citas</span>
            <strong>{integer.format(kpis.appointments)}</strong>
          </div>
          <div>
            <span>Ticket promedio</span>
            <strong>{cop(avgTicket)}</strong>
          </div>
          <div>
            <span>Cancelaciones</span>
            <strong>{integer.format(kpis.cancellations)}</strong>
          </div>
        </div>
      </Panel>

      <div className="gd-summary" data-gd-enter style={{ "--gd-i": 1 } as CSSProperties}>
        <Metric title="Citas del período" icon={CalendarCheck} value={kpis.appointments} delta={kpis.appointmentsDelta} highlight index={1} testId="admin-kpi-appointments" />
        <Metric title="Profesionales activos" icon={Users} value={kpis.activeProfessionals} detail="Con agenda configurada" index={2} testId="admin-kpi-active-staff" />
        <Metric title="Citas pendientes" icon={Clock} value={kpis.pending} detail="Por confirmar o gestionar" index={3} testId="admin-kpi-pending-approvals" />
        <Metric title="Pacientes nuevos" icon={Users} value={kpis.newPatients} delta={kpis.newPatientsDelta} index={4} />
      </div>

      <div className="gd-command-side">
        <Panel title="Ocupación de agenda" subtitle={`${formatCount.percent(kpis.utilization)} de los turnos publicados`} index={2}>
          <div
            className="gd-track"
            role="meter"
            aria-label="Ocupación de agenda"
            aria-valuenow={kpis.bookedSlots}
            aria-valuemin={0}
            aria-valuemax={Math.max(1, kpis.totalSlots)}
          >
            <span className="gd-fill" style={{ width: `${Math.min(100, kpis.utilization)}%` }} />
          </div>
          <div className="gd-track-label">
            <span>
              <strong>{integer.format(kpis.bookedSlots)}</strong> reservados
            </span>
            <span>{integer.format(kpis.totalSlots)} turnos</span>
          </div>
        </Panel>
        <Panel title="Por gestionar" index={3}>
          <div className="gd-row">
            <span className="gd-metric-icon" aria-hidden="true">
              <Clock size={16} />
            </span>
            <div>
              <strong>{integer.format(kpis.pending)} citas esperan confirmación</strong>
              <small>Revísalas en el tablero de operaciones</small>
            </div>
            <button type="button" className="gd-icon-button" aria-label="Abrir operaciones" onClick={() => open("operaciones")}>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </Panel>
      </div>

      <Panel
        title="Tendencia de ingresos"
        subtitle="Evolución en el período seleccionado"
        className="gd-span-2"
        index={4}
        action={
          <div className="gd-legend">
            <span data-tone="revenue">
              <i aria-hidden="true" />
              Ingresos
            </span>
            <span data-tone="volume">
              <i aria-hidden="true" />
              Citas
            </span>
          </div>
        }
      >
        <RevenueChart labels={trend.labels} revenue={trend.revenue} appointments={trend.appointments} />
      </Panel>
      <StaffPanel staff={data.staff} href={staffHref} index={5} />

      <AppointmentsPanel appointments={data.appointments} inspect={inspect} index={6} appointmentsHref={appointmentsHref} />
    </div>
  );
}

function TrendsView({ data, download }: { data: GlassyDashboardData; download: () => void }) {
  const { kpis, trend } = data;
  const avgTicket = kpis.appointments > 0 ? kpis.revenue / kpis.appointments : 0;
  const peakIndex = trend.revenue.reduce((best, value, index, list) => (value > list[best] ? index : best), 0);
  return (
    <div className="gd-stack">
      <div className="gd-metric-grid">
        <Metric title="Ingresos" icon={CreditCard} value={kpis.revenue} format="compact" delta={kpis.revenueDelta} highlight index={0} />
        <Metric title="Ticket promedio" icon={TrendUp} value={avgTicket} format="compact" detail="por cita" index={1} />
        <Metric title="Citas" icon={CalendarCheck} value={kpis.appointments} delta={kpis.appointmentsDelta} index={2} />
        <Metric title="Mejor intervalo" icon={ChartLineUp} value={trend.revenue[peakIndex] ?? 0} format="compact" detail={trend.labels[peakIndex] ?? "Sin datos"} index={3} />
      </div>
      <Panel
        title="Ingresos y citas"
        subtitle="Pasa el cursor sobre la gráfica para ver cada intervalo"
        index={4}
        action={
          <div className="gd-legend">
            <span data-tone="revenue">
              <i aria-hidden="true" />
              Ingresos
            </span>
            <span data-tone="volume">
              <i aria-hidden="true" />
              Citas
            </span>
          </div>
        }
      >
        <RevenueChart labels={trend.labels} revenue={trend.revenue} appointments={trend.appointments} />
      </Panel>
      <Panel title="Reporte del período" index={5}>
        <div className="gd-row">
          <span className="gd-metric-icon" aria-hidden="true">
            <Clock size={16} />
          </span>
          <div>
            <strong>Ingresos y citas por intervalo</strong>
            <small>
              {data.rangeLabel} · {trend.labels[0] ?? "—"} a {trend.labels.at(-1) ?? "—"}
            </small>
          </div>
          <button type="button" className="gd-icon-button" aria-label="Descargar CSV de ingresos" onClick={download}>
            <FileArrowUp size={16} aria-hidden="true" />
          </button>
        </div>
      </Panel>
    </div>
  );
}

function MetricsView({ data, inspect, appointmentsHref }: { data: GlassyDashboardData; inspect: (item: GlassyAppointment) => void; appointmentsHref: string }) {
  const { kpis, trend } = data;
  return (
    <div className="gd-stack">
      <div className="gd-metric-grid">
        <Metric title="Citas" icon={CalendarCheck} value={kpis.appointments} delta={kpis.appointmentsDelta} highlight index={0} />
        <Metric title="Pacientes nuevos" icon={Users} value={kpis.newPatients} delta={kpis.newPatientsDelta} index={1} />
        <Metric title="Ocupación" icon={ChartLineUp} value={kpis.utilization} format="percent" detail="de los turnos publicados" index={2} />
        <Metric title="Cancelaciones" icon={XCircle} value={kpis.cancellations} delta={kpis.cancellationsDelta} index={3} />
      </div>
      <div className="gd-two">
        <Panel title="Volumen de citas" subtitle="Citas agendadas en cada intervalo" index={4}>
          <BarChart labels={trend.labels} values={trend.appointments} format={(value) => `${integer.format(value)} citas`} title="Citas" />
        </Panel>
        <Panel title="Citas por estado" subtitle="Toca un estado para resaltarlo" index={5}>
          <StatusRing mix={data.statusMix} />
        </Panel>
      </div>
      <AppointmentsPanel appointments={data.appointments} inspect={inspect} index={6} appointmentsHref={appointmentsHref} />
    </div>
  );
}

const LANES: { id: string; label: string; tone: GlassyStatusTone; icon: IconComponent; tones: GlassyStatusTone[] }[] = [
  { id: "scheduled", label: "Por confirmar", tone: "scheduled", icon: Clock, tones: ["scheduled"] },
  { id: "confirmed", label: "Confirmadas", tone: "confirmed", icon: CalendarCheck, tones: ["confirmed", "active"] },
  { id: "completed", label: "Completadas", tone: "completed", icon: CheckCircle, tones: ["completed"] },
  { id: "closed", label: "Canceladas o inasistencias", tone: "closed", icon: XCircle, tones: ["closed"] },
];

function OperationsView({ data, inspect }: { data: GlassyDashboardData; inspect: (item: GlassyAppointment) => void }) {
  const [filter, setFilter] = useState("ALL");
  const lanes = filter === "ALL" ? LANES : LANES.filter((lane) => lane.id === filter);
  const professionals = new Set(data.appointments.map((item) => item.professional)).size;
  return (
    <div className="gd-stack">
      <div className="gd-metric-grid">
        <Metric title="Ingresos" icon={CreditCard} value={data.kpis.revenue} format="compact" detail={data.rangeLabel} highlight index={0} />
        <Metric title="Citas en tablero" icon={CalendarCheck} value={data.appointments.length} detail="en el período" index={1} />
        <Metric title="Por confirmar" icon={Clock} value={data.kpis.pending} detail="esperan gestión" index={2} />
        <Metric title="Profesionales" icon={Users} value={professionals} detail="con citas en el tablero" index={3} />
      </div>
      <Panel
        title="Tablero de operaciones"
        subtitle="Sigue cada cita según su estado y abre el detalle."
        index={4}
        action={
          <label className="gd-filter">
            <Funnel size={14} aria-hidden="true" />
            <select aria-label="Filtrar columnas" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="ALL">Todas las columnas</option>
              {LANES.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.label}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div className="gd-lanes" data-filtered={filter !== "ALL"}>
          {lanes.map((lane) => {
            const items = data.appointments.filter((item) => lane.tones.includes(item.tone));
            const LaneIcon = lane.icon;
            return (
              <section className="gd-lane" key={lane.id} aria-label={lane.label}>
                <header>
                  <i data-tone={lane.tone} aria-hidden="true">
                    <LaneIcon size={14} />
                  </i>
                  <h3>{lane.label}</h3>
                  <span>{items.length}</span>
                </header>
                <div className="gd-lane-list">
                  {items.map((item) => (
                    <button className="gd-work" type="button" onClick={() => inspect(item)} key={item.id}>
                      <strong>{item.patient}</strong>
                      <span>{item.service}</span>
                      <span className="gd-work-meta">
                        <span>{item.professional}</span>
                        <span>
                          {item.dateLabel} · {item.timeLabel}
                        </span>
                      </span>
                    </button>
                  ))}
                  {items.length === 0 && <p className="gd-empty">Sin citas.</p>}
                </div>
              </section>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ───────────────────────────── Diálogo ───────────────────────────── */

function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      className="gd-dialog"
      ref={ref}
      aria-labelledby={label}
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <section className="gd-dialog-inner">
        <header>
          <h2 id={label}>{title}</h2>
          <button type="button" className="gd-icon-button" aria-label="Cerrar" onClick={() => ref.current?.close()}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}

/* ───────────────────────────── Raíz ───────────────────────────── */

const VIEWS: { id: View; label: string; short: string; title: string; icon: IconComponent; description: string }[] = [
  { id: "resumen", label: "Resumen", short: "Resumen", title: "Gestión general", icon: SquaresFour, description: "Monitorea las métricas clave por período y actúa rápido sobre operaciones." },
  { id: "tendencias", label: "Tendencias", short: "Tendencias", title: "Tendencias", icon: TrendUp, description: "Compara ingresos y volumen de citas en el tiempo." },
  { id: "metricas", label: "Métricas", short: "Métricas", title: "Métricas", icon: ChartLineUp, description: "Citas, pacientes nuevos, ocupación y estados de la agenda." },
  { id: "operaciones", label: "Operaciones", short: "Operación", title: "Operaciones", icon: CalendarCheck, description: "Gestiona las citas por confirmar, confirmadas y cerradas." },
];

const PERIODS: { key: string; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "last7", label: "7 días" },
  { key: "last30", label: "30 días" },
  { key: "mtd", label: "Mes actual" },
  { key: "ytd", label: "Año" },
  { key: "custom", label: "Personalizado" },
];

function saveCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function GlassyDashboard({
  data,
  appointmentsHref = "/portal/admin/appointments",
  staffHref = "/portal/admin/staff",
}: GlassyDashboardProps) {
  const [view, selectView] = useHashView();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(data.rangeKey === "custom");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = VIEWS.find((item) => item.id === view) ?? VIEWS[0];
  const selected = selectedId ? data.appointments.find((item) => item.id === selectedId) : undefined;
  const inspect = (item: GlassyAppointment) => setSelectedId(item.id);

  const pushRange = (params: URLSearchParams) => {
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}${window.location.hash}`, { scroll: false });
    });
  };

  const changePeriod = (key: string) => {
    if (key === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    params.delete("from");
    params.delete("to");
    pushRange(params);
  };

  const changeCustom = (from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    pushRange(params);
  };

  const downloadTrends = () =>
    saveCsv(`dentpro-ingresos-${data.rangeKey}.csv`, [
      ["Intervalo", "Ingresos (COP)", "Citas"],
      ...data.trend.labels.map((label, index) => [label, Math.round(data.trend.revenue[index] ?? 0), data.trend.appointments[index] ?? 0]),
    ]);
  const downloadOperations = () =>
    saveCsv(`dentpro-citas-${data.rangeKey}.csv`, [
      ["ID", "Paciente", "Servicio", "Profesional", "Estado", "Fecha", "Hora"],
      ...data.appointments.map((item) => [item.id, item.patient, item.service, item.professional, item.statusLabel, item.dateLabel, item.timeLabel]),
    ]);

  const pressedPeriod = customOpen ? "custom" : data.rangeKey;

  return (
    <div className="gd-dash">
      <header className="gd-view-head">
        <div data-testid="admin-dashboard-title">
          <span className="gd-eyebrow">Portal administrador · {data.rangeLabel}</span>
          <h1>{current.title}</h1>
          <p>{current.description}</p>
        </div>
        <div className="gd-view-actions">
          <div className="gd-period" role="group" aria-label="Período del reporte" aria-busy={isPending}>
            {PERIODS.map((item) => (
              <button type="button" key={item.key} aria-pressed={item.key === pressedPeriod} onClick={() => changePeriod(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          {(view === "tendencias" || view === "operaciones") && (
            <button type="button" className="gd-primary" onClick={view === "operaciones" ? downloadOperations : downloadTrends}>
              <FileArrowUp size={16} aria-hidden="true" />
              Exportar CSV
            </button>
          )}
          {customOpen && (
            <div className="gd-custom" key={`${data.fromInput}-${data.toInput}`}>
              <label>
                Desde
                <input type="date" defaultValue={data.fromInput} max={data.toInput || undefined} onChange={(event) => changeCustom(event.target.value, data.toInput)} />
              </label>
              <label>
                Hasta
                <input type="date" defaultValue={data.toInput} min={data.fromInput || undefined} onChange={(event) => changeCustom(data.fromInput, event.target.value)} />
              </label>
            </div>
          )}
        </div>
      </header>

      <div className="gd-content" key={`${view}-${data.rangeKey}-${data.fromInput}-${data.toInput}`} data-view={view}>
        {view === "resumen" && <SummaryView data={data} open={selectView} inspect={inspect} appointmentsHref={appointmentsHref} staffHref={staffHref} />}
        {view === "tendencias" && <TrendsView data={data} download={downloadTrends} />}
        {view === "metricas" && <MetricsView data={data} inspect={inspect} appointmentsHref={appointmentsHref} />}
        {view === "operaciones" && <OperationsView data={data} inspect={inspect} />}
      </div>

      <GlassyDock
        variant="bottom"
        ariaLabel="Vistas del inicio"
        items={VIEWS.map((item) => ({
          key: item.id,
          href: `#${item.id}`,
          label: item.label,
          short: item.short,
          icon: item.icon,
          active: item.id === view,
          onSelect: () => selectView(item.id),
        }))}
      />

      {selected && (
        <Dialog key={selected.id} title={selected.patient} close={() => setSelectedId(null)}>
          <div>
            <Badge label={selected.statusLabel} tone={selected.tone} />
          </div>
          <dl className="gd-facts">
            <div>
              <dt>Servicio</dt>
              <dd>{selected.service}</dd>
            </div>
            <div>
              <dt>Profesional</dt>
              <dd>{selected.professional}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{selected.dateLabel}</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd>{selected.timeLabel}</dd>
            </div>
          </dl>
          <Link className="gd-primary" href={appointmentsHref}>
            Gestionar en la agenda <CaretRight size={16} aria-hidden="true" />
          </Link>
        </Dialog>
      )}
    </div>
  );
}

export default GlassyDashboard;
