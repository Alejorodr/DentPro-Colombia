// DentPro Marketing — Booking form (the gradient panel)
const { CalendarCheck: BCal, ShieldCheck: BShield, UsersThree: BUsers, CreditCard: BCard, CheckCircle: BCheck } = window.DPIcons;

const BENEFITS = [
  { Icon: BCal, text: "Horarios extendidos y recordatorios automáticos" },
  { Icon: BShield, text: "Especialistas certificados por asociaciones internacionales" },
  { Icon: BUsers, text: "Acompañamiento del equipo de Patient Care en todo momento" },
  { Icon: BCard, text: "Planes de financiación y convenios empresariales" },
];

const SERVICE_OPTIONS = [
  { value: "limpieza", label: "Limpieza y profilaxis" },
  { value: "ortodoncia", label: "Ortodoncia" },
  { value: "implantes", label: "Implantes" },
  { value: "estetica", label: "Estética dental" },
  { value: "endodoncia", label: "Endodoncia" },
  { value: "odontopediatria", label: "Odontopediatría" },
];

const SLOTS = ["Mar 15 nov · 9:00 a. m. · Ortodoncia · Dra. López", "Mié 16 nov · 3:00 p. m. · Estética · Dr. Kim", "Jue 17 nov · 11:30 a. m. · Implantes · Dr. Pérez"];

function DPBooking() {
  const [submitted, setSubmitted] = React.useState(false);
  return (
    <section id="agenda" className="dp-section" style={{ background: "#fff" }}>
      <div className="dp-container" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 48, alignItems: "start" }}>
        <div className="dp-booking-panel">
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Agenda tu valoración integral</h2>
          <p style={{ fontSize: 15, color: "var(--color-brand-light)", margin: "12px 0 20px", lineHeight: 1.55 }}>
            Revisa la disponibilidad inicial y elige si prefieres reservar tu turno ahora o que nuestro equipo te contacte para ayudarte.
          </p>
          <div style={{
            border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.10)",
            borderRadius: 18,
            padding: 16,
            display: "flex", flexDirection: "column", gap: 10,
            fontSize: 13,
          }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="dp-btn dp-btn-primary" style={{ background: "#fff", color: "var(--color-brand-teal)" }}>Reservar turno</button>
              <a href="#contacto" className="dp-btn dp-btn-secondary" style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}>Te contactamos</a>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(230,244,255,0.95)" }}>Próximos turnos disponibles:</p>
            <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--color-brand-light)" }}>
              {SLOTS.map((s) => <li key={s}>• {s}</li>)}
            </ul>
          </div>
          <form style={{ marginTop: 24, display: "grid", gap: 16 }} onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lblStyle}>Nombre completo</label><input className="dp-input dp-input-on-gradient" placeholder="Ej. Mariana López" required /></div>
              <div><label style={lblStyle}>Celular</label><input className="dp-input dp-input-on-gradient" placeholder="Ej. 300 123 4567" required /></div>
            </div>
            <div><label style={lblStyle}>Correo electrónico</label><input className="dp-input dp-input-on-gradient" type="email" placeholder="Ej. nombre@correo.com" /></div>
            <div><label style={lblStyle}>¿Qué tratamiento te interesa?</label>
              <select className="dp-input dp-input-on-gradient" defaultValue="" required>
                <option value="" disabled>Selecciona una opción</option>
                {SERVICE_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ color: "var(--fg-1)" }}>{o.label}</option>)}
              </select>
            </div>
            <div><label style={lblStyle}>Fecha preferida</label><input className="dp-input dp-input-on-gradient" type="date" /></div>
            <button type="submit" className="dp-btn dp-btn-primary" style={{ background: "#fff", color: "var(--color-brand-teal)", justifyContent: "center" }}>
              {submitted ? "¡Gracias! Te contactaremos muy pronto." : "Solicitar agenda"}
            </button>
            <p style={{ fontSize: 11, color: "rgba(230,244,255,0.85)", margin: 0, lineHeight: 1.5 }}>
              Al enviar este formulario autorizas el tratamiento de tus datos según nuestra política de privacidad.
            </p>
          </form>
        </div>
        <div className="dp-card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 22, fontWeight: 600, color: "var(--fg-1)", margin: 0 }}>Beneficios de agendar con nosotros</h3>
          <ul style={{ padding: 0, margin: "22px 0 0", listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {BENEFITS.map((b) => (
              <li key={b.text} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span className="dp-icon-badge"><b.Icon size={20} /></span>
                <span style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.5 }}>{b.text}</span>
              </li>
            ))}
          </ul>
          <div style={{
            marginTop: 22, padding: 20, borderRadius: 18,
            background: "rgba(230,244,255,0.7)",
            color: "var(--fg-2)", fontSize: 13, lineHeight: 1.55,
          }}>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--color-brand-indigo)" }}>Horario extendido</p>
            <p style={{ margin: "8px 0 0" }}>Disponibilidad de lunes a sábado de 8:00 a 19:00 y domingos o festivos con cita previa en nuestra sede de Chía.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const lblStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 6 };

window.DPBooking = DPBooking;
