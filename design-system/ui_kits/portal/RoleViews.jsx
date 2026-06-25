// DentPro Portal — Patient + Professional + Receptionist views
const RI = window.DPIcons;

// ────────────────────────────────────────────────────────────────────
//  PATIENT PORTAL  (mirrors app/portal/client/)
// ────────────────────────────────────────────────────────────────────
const NEXT_VISIT = {
  date: "Sáb 28 nov · 10:30 a. m.",
  service: "Control mensual de ortodoncia",
  pro: "Dra. Laura López",
  room: "Box 3 · Sede Chía",
};

const PATIENT_HISTORY = [
  { date: "12 oct 2026", service: "Activación de brackets", pro: "Dra. Laura López", note: "Cambio de elásticos · 6 semanas hasta el próximo control" },
  { date: "14 sep 2026", service: "Limpieza profesional", pro: "Dra. Camila Ruiz", note: "Higiene satisfactoria · refuerzo en zona molar inferior" },
  { date: "10 ago 2026", service: "Radiografía panorámica", pro: "Laboratorio digital", note: "Imagen disponible en archivos" },
];

const CONSENTS = [
  { name: "Consentimiento de ortodoncia", status: "Firmado", date: "Mar 14 ago 2026" },
  { name: "Tratamiento de datos personales", status: "Firmado", date: "Mar 14 ago 2026" },
  { name: "Plan de financiación", status: "Pendiente", date: "Vence 30 nov" },
];

function DPPatientDashboard() {
  return (
    <>
      <div className="pp-card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span className="pp-avatar" style={{ width: 56, height: 56, fontSize: 18 }}>ML</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>Mariana López</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>ID: #DP-24081 · Paciente desde agosto 2026</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="pp-status confirmed">Ortodoncia activa</span>
          <span className="pp-status" style={{ background: "var(--color-brand-light)", color: "var(--color-brand-teal)" }}>DentPro Chía</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <div className="pp-card" style={{ background: "linear-gradient(135deg, #0a3d91 0%, #1f6cd3 60%, #4cc3f1 100%)", color: "#fff", border: "none" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>Próxima cita</div>
          <div style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 4px" }}>{NEXT_VISIT.date}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.9)" }}>{NEXT_VISIT.service}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{NEXT_VISIT.pro} · {NEXT_VISIT.room}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button style={btnLightStyle}>Reprogramar</button>
            <button style={btnGhostOnGradStyle}>Cancelar cita</button>
          </div>
        </div>

        <div className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="pp-eyebrow">Accesos rápidos</div>
          <button style={quickAction}><RI.CalendarCheck size={18} /> Agendar nueva cita</button>
          <button style={quickAction}><RI.FileText size={18} /> Ver historia clínica</button>
          <button style={quickAction}><RI.ClipboardText size={18} /> Firmar consentimientos</button>
          <button style={quickAction}><RI.WhatsappLogo size={18} /> Hablar con Patient Care</button>
        </div>
      </div>

      <div className="pp-card">
        <div className="pp-section-head">
          <div className="pp-eyebrow">Tratamientos recientes</div>
          <h3 className="pp-h2" style={{ fontSize: 18 }}>Historia clínica</h3>
        </div>
        <div style={{ marginTop: 12 }}>
          {PATIENT_HISTORY.map((h) => (
            <div className="pp-row" key={h.date}>
              <span className="pp-avatar" style={{ width: 36, height: 36, fontSize: 11 }}><RI.Tooth size={18} /></span>
              <div style={{ flex: 1 }}>
                <div className="pp-row-title">{h.service}</div>
                <div className="pp-row-meta">{h.date} · {h.pro}</div>
                <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4 }}>{h.note}</div>
              </div>
              <button className="pp-icon-btn" style={{ width: 32, height: 32 }}><RI.CaretRight size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="pp-card">
        <div className="pp-section-head">
          <div className="pp-eyebrow">Documentos legales</div>
          <h3 className="pp-h2" style={{ fontSize: 18 }}>Consentimientos</h3>
        </div>
        <div style={{ marginTop: 12 }}>
          {CONSENTS.map((c) => (
            <div className="pp-row" key={c.name}>
              <span className="pp-avatar" style={{ background: c.status === "Firmado" ? "rgba(22,163,74,0.12)" : "rgba(217,119,6,0.12)", color: c.status === "Firmado" ? "#15803d" : "#b45309", width: 36, height: 36 }}>
                {c.status === "Firmado" ? <RI.ShieldCheck size={18} /> : <RI.FileText size={18} />}
              </span>
              <div style={{ flex: 1 }}>
                <div className="pp-row-title">{c.name}</div>
                <div className="pp-row-meta">{c.date}</div>
              </div>
              <span className={"pp-status " + (c.status === "Firmado" ? "confirmed" : "pending")}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const btnLightStyle = {
  background: "#fff", color: "var(--color-brand-teal)",
  border: "none", borderRadius: 9999, padding: "10px 20px",
  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
const btnGhostOnGradStyle = {
  background: "transparent", color: "#fff",
  border: "1px solid rgba(255,255,255,0.5)", borderRadius: 9999, padding: "10px 20px",
  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
const quickAction = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "12px 14px", borderRadius: 14,
  border: "1px solid var(--border-1)", background: "#fff",
  color: "var(--fg-1)", fontSize: 13, fontWeight: 500, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
};

// ────────────────────────────────────────────────────────────────────
//  PROFESSIONAL AGENDA
// ────────────────────────────────────────────────────────────────────
const AGENDA_SLOTS = [
  { time: "08:00", duration: 30, patient: "Mariana López", service: "Control de brackets", status: "confirmed" },
  { time: "08:30", duration: 60, patient: "Carlos Méndez", service: "Activación + escaneo 3D", status: "in-progress" },
  { time: "09:30", duration: null, patient: null, service: "Disponible" },
  { time: "10:00", duration: 45, patient: "Sofía Restrepo", service: "Primera valoración", status: "confirmed" },
  { time: "10:45", duration: 30, patient: "Andrés Quintero", service: "Control mensual", status: "pending" },
  { time: "11:15", duration: null, patient: null, service: "Almuerzo" },
  { time: "14:00", duration: 60, patient: "Valentina Ortiz", service: "Inicio tratamiento", status: "confirmed" },
  { time: "15:00", duration: 30, patient: "Lucía Hernández", service: "Cambio de elásticos", status: "confirmed" },
];

function DPProfessionalAgenda() {
  return (
    <>
      <div className="pp-section-head">
        <div className="pp-eyebrow">Hoy · Miércoles 25 de noviembre</div>
        <h1 className="pp-h2">Agenda — Dra. Laura López</h1>
        <p className="pp-h2-sub">Ortodoncia · Sede Chía · Box 3</p>
      </div>

      <div className="pp-kpi-grid">
        <div className="pp-card pp-kpi"><div className="pp-kpi-label">Citas hoy</div><div className="pp-kpi-value">8</div><div className="pp-kpi-change">2 controles · 6 tratamientos</div></div>
        <div className="pp-card pp-kpi"><div className="pp-kpi-label">Confirmadas</div><div className="pp-kpi-value">6</div><div className="pp-kpi-change">75% ocupación</div></div>
        <div className="pp-card pp-kpi"><div className="pp-kpi-label">Por confirmar</div><div className="pp-kpi-value">1</div><div className="pp-kpi-change">Andrés Quintero</div></div>
        <div className="pp-card pp-kpi"><div className="pp-kpi-label">Tiempo libre</div><div className="pp-kpi-value">1h 15m</div><div className="pp-kpi-change">09:30 + almuerzo</div></div>
      </div>

      <div className="pp-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-1)", margin: 0 }}>Cronograma del día</h3>
          <div className="pp-pill-group">
            <button className="pp-pill active">Día</button>
            <button className="pp-pill">Semana</button>
            <button className="pp-pill">Mes</button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {AGENDA_SLOTS.map((s, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "70px 1fr auto",
              gap: 16, alignItems: "center",
              padding: "14px 16px", borderRadius: 14,
              border: "1px solid var(--border-1)",
              background: s.patient ? "#fff" : "rgba(248,250,252,0.6)",
              borderLeftWidth: s.patient ? 4 : 1,
              borderLeftColor: s.status === "in-progress" ? "var(--color-brand-indigo)" : s.status === "pending" ? "#d97706" : s.status === "confirmed" ? "#16a34a" : "var(--border-1)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-1)" }}>{s.time}{s.duration ? <div style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 500 }}>{s.duration} min</div> : null}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: s.patient ? "var(--fg-1)" : "var(--fg-3)" }}>{s.patient || s.service}</div>
                {s.patient && <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{s.service}</div>}
              </div>
              {s.patient && <span className={"pp-status " + s.status}>{s.status === "in-progress" ? "En consulta" : s.status === "pending" ? "Por confirmar" : "Confirmada"}</span>}
              {!s.patient && <button className="pp-pill" style={{ background: "var(--color-brand-light)", color: "var(--color-brand-teal)" }}>+ Agregar</button>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
//  RECEPTIONIST DASHBOARD
// ────────────────────────────────────────────────────────────────────
function DPReceptionistDashboard() {
  return (
    <>
      <div className="pp-section-head">
        <div className="pp-eyebrow">Recepción · Hoy</div>
        <h1 className="pp-h2">Check-in & turnos del día</h1>
        <p className="pp-h2-sub">Coordina llegadas, llamadas y pagos en una sola pantalla.</p>
      </div>

      <div className="pp-kpi-grid">
        <div className="pp-card pp-kpi"><div className="pp-kpi-label">En sala</div><div className="pp-kpi-value">3</div><div className="pp-kpi-change">2 con cita · 1 sin cita</div></div>
        <div className="pp-card pp-kpi"><div className="pp-kpi-label">Pendientes hoy</div><div className="pp-kpi-value">14</div><div className="pp-kpi-change">5 sin confirmar</div></div>
        <div className="pp-card pp-kpi"><div className="pp-kpi-label">Pagos del día</div><div className="pp-kpi-value">$3.420.000</div><div className="pp-kpi-change">+18% vs ayer</div></div>
        <div className="pp-card pp-kpi"><div className="pp-kpi-label">No-shows</div><div className="pp-kpi-value">1</div><div className="pp-kpi-change">Carlos Méndez · 09:15</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="pp-card">
          <div className="pp-eyebrow">Cola actual</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-1)", margin: "6px 0 12px" }}>Pacientes en sala</h3>
          {[
            { name: "Sofía Restrepo", time: "Llegó 09:55", pro: "Dra. Camila Ruiz", status: "Lista para box" },
            { name: "Andrés Quintero", time: "Llegó 10:30", pro: "Dr. Daniel Kim", status: "Esperando" },
            { name: "Valentina Ortiz", time: "Llegó 11:10", pro: "Dra. Laura López", status: "En check-in" },
          ].map((p) => (
            <div className="pp-row" key={p.name}>
              <span className="pp-avatar" style={{ width: 36, height: 36, fontSize: 11 }}>{p.name.split(" ").map(s => s[0]).slice(0, 2).join("")}</span>
              <div style={{ flex: 1 }}>
                <div className="pp-row-title">{p.name}</div>
                <div className="pp-row-meta">{p.time} · {p.pro}</div>
              </div>
              <span className="pp-status confirmed">{p.status}</span>
            </div>
          ))}
        </div>

        <div className="pp-card">
          <div className="pp-eyebrow">Próximas llamadas</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-1)", margin: "6px 0 12px" }}>Confirmaciones por hacer</h3>
          {[
            { name: "Felipe Cárdenas", phone: "+57 312 ··· 4521", service: "Mañana 9:00 a. m. · Blanqueamiento" },
            { name: "Diana Sanabria", phone: "+57 300 ··· 1287", service: "Mañana 11:30 a. m. · Ortodoncia" },
            { name: "Jorge Castaño", phone: "+57 314 ··· 9904", service: "Vie 27 nov 3:00 p. m. · Implante" },
          ].map((p) => (
            <div className="pp-row" key={p.name}>
              <span className="pp-avatar" style={{ width: 36, height: 36, fontSize: 11, background: "rgba(31,108,211,0.12)", color: "var(--color-brand-indigo)" }}><RI.Phone size={16} /></span>
              <div style={{ flex: 1 }}>
                <div className="pp-row-title">{p.name}</div>
                <div className="pp-row-meta">{p.phone} · {p.service}</div>
              </div>
              <button className="pp-icon-btn" aria-label="Llamar" style={{ width: 32, height: 32, background: "var(--color-brand-teal)", color: "#fff", border: "none" }}>
                <RI.Phone size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

window.DPPatientDashboard = DPPatientDashboard;
window.DPProfessionalAgenda = DPProfessionalAgenda;
window.DPReceptionistDashboard = DPReceptionistDashboard;
