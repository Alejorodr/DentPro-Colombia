// DentPro Portal — Admin dashboard. Mirrors app/portal/admin/page.tsx.
const AI = window.DPIcons;

const ADMIN_KPIS = [
  { label: "Appointments Today", value: "42", change: "En últimos 7 días" },
  { label: "Revenue MTD", value: "$48.250.000", change: "Ingresos del período" },
  { label: "Active Staff", value: "12", change: "Profesionales activos" },
  { label: "Pending Approvals", value: "5", change: "Citas pendientes" },
];

const REVENUE_BARS = [12, 18, 14, 22, 26, 19, 24, 28, 30, 25, 32, 38, 34, 29, 36];
const REVENUE_LABELS = ["1 Nov", "3", "5", "7", "9", "11", "13", "15", "17", "19", "21", "23", "25", "27", "29"];

const STAFF_ON_DUTY = [
  { name: "Dra. Laura López", specialty: "Ortodoncia", status: "On duty", room: "Box 3", initials: "LL" },
  { name: "Dr. Andrés Pérez", specialty: "Implantología", status: "On duty", room: "Box 1", initials: "AP" },
  { name: "Dra. Camila Ruiz", specialty: "Endodoncia", status: "Break", room: "Box 2", initials: "CR" },
  { name: "Dr. Daniel Kim", specialty: "Estética", status: "On duty", room: "Box 4", initials: "DK" },
];

const APPOINTMENTS = [
  { time: "08:30", patient: "Mariana López", pro: "Dra. Laura López", service: "Control ortodoncia", status: "confirmed" },
  { time: "09:15", patient: "Carlos Méndez", pro: "Dr. Andrés Pérez", service: "Implante posterior", status: "in-progress" },
  { time: "10:00", patient: "Sofía Restrepo", pro: "Dra. Camila Ruiz", service: "Endodoncia molar", status: "confirmed" },
  { time: "10:45", patient: "Andrés Quintero", pro: "Dr. Daniel Kim", service: "Diseño de sonrisa", status: "pending" },
  { time: "11:30", patient: "Valentina Ortiz", pro: "Dra. Laura López", service: "Primera valoración", status: "confirmed" },
  { time: "12:15", patient: "Juan Pablo Vega", pro: "Dr. Andrés Pérez", service: "Cirugía periodontal", status: "cancelled" },
  { time: "14:00", patient: "Lucía Hernández", pro: "Dra. Camila Ruiz", service: "Limpieza profunda", status: "confirmed" },
  { time: "15:30", patient: "Felipe Cárdenas", pro: "Dr. Daniel Kim", service: "Blanqueamiento", status: "confirmed" },
];

const STATUS_LABEL = {
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  "in-progress": "In progress",
};

function DPAdminDashboard() {
  const [range, setRange] = React.useState("last7");
  return (
    <>
      <div className="pp-section-head">
        <div className="pp-eyebrow">Portal Administrador</div>
        <h1 className="pp-h2">Gestión general</h1>
        <p className="pp-h2-sub">Monitorea las métricas clave por período y actúa rápido sobre operaciones.</p>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div className="pp-pill-group">
          {[{k:"today", l:"Today"}, {k:"last7", l:"Last 7"}, {k:"last30", l:"Last 30"}, {k:"mtd", l:"MTD"}, {k:"ytd", l:"YTD"}].map((p) => (
            <button key={p.k} className={"pp-pill" + (range === p.k ? " active" : "")} onClick={() => setRange(p.k)}>{p.l}</button>
          ))}
        </div>
        <button className="pp-pill" style={{ background: "#fff", border: "1px solid var(--border-1)", color: "var(--fg-2)" }}>
          Export CSV
        </button>
      </div>

      <div className="pp-kpi-grid">
        {ADMIN_KPIS.map((k) => (
          <div className="pp-card pp-kpi" key={k.label}>
            <div className="pp-kpi-label">{k.label}</div>
            <div className="pp-kpi-value">{k.value}</div>
            <div className="pp-kpi-change">{k.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div className="pp-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div className="pp-eyebrow">Revenue trends</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-1)", margin: "6px 0 0" }}>Last 30 Days Performance</h3>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--fg-1)" }}>$148.320.000</div>
              <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <AI.TrendUp size={14} /> +12.4% vs anterior
              </div>
            </div>
          </div>
          <div className="pp-chart">
            {REVENUE_BARS.map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div className="pp-bar" style={{ height: `${h * 3.5}px`, width: "100%" }}></div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "var(--fg-4)" }}>
            {REVENUE_LABELS.filter((_, i) => i % 3 === 0).map(l => <span key={l}>{l}</span>)}
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-eyebrow">Staff on duty</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-1)", margin: "6px 0 16px" }}>Hoy en clínica</h3>
          <div>
            {STAFF_ON_DUTY.map((s) => (
              <div className="pp-row" key={s.name}>
                <span className="pp-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{s.initials}</span>
                <div style={{ flex: 1 }}>
                  <div className="pp-row-title">{s.name}</div>
                  <div className="pp-row-meta">{s.specialty} · {s.room}</div>
                </div>
                <span className={"pp-status " + (s.status === "On duty" ? "confirmed" : "pending")}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pp-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div className="pp-eyebrow">Today's appointments</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-1)", margin: "6px 0 0" }}>Próximas citas</h3>
          </div>
          <button className="pp-pill" style={{ background: "var(--color-brand-teal)", color: "#fff" }}>+ Nueva cita</button>
        </div>
        <table className="pp-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Hora</th>
              <th>Paciente</th>
              <th>Profesional</th>
              <th>Servicio</th>
              <th style={{ width: 120 }}>Estado</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {APPOINTMENTS.map((a) => (
              <tr key={a.patient}>
                <td style={{ fontWeight: 600, color: "var(--color-brand-teal)" }}>{a.time}</td>
                <td>{a.patient}</td>
                <td style={{ color: "var(--fg-2)" }}>{a.pro}</td>
                <td style={{ color: "var(--fg-2)" }}>{a.service}</td>
                <td><span className={"pp-status " + a.status}>{STATUS_LABEL[a.status]}</span></td>
                <td><button className="pp-icon-btn" style={{ width: 32, height: 32 }} aria-label="Ver"><AI.CaretRight size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

window.DPAdminDashboard = DPAdminDashboard;
