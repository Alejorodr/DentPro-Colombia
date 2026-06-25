// DentPro Marketing — Login modal + floating actions
const { X: LX, UserCircle: LUC, Phone: FPhone, WhatsappLogo: FWa, CalendarCheck: LCal, Tooth: LTooth, ShieldCheck: LShield } = window.DPIcons;
const lFeat = { display: "flex", gap: 10, alignItems: "center" };

function DPLoginModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="dp-modal-backdrop" onClick={onClose}>
      <div className="dp-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <button className="dp-modal-close" onClick={onClose} aria-label="Cerrar"><LX size={18} /></button>
        <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 18, justifyContent: "center" }}>
          <span className="dp-badge" style={{ alignSelf: "flex-start" }}>Acceso de pacientes</span>
          <h2 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "var(--fg-1)" }}>Inicia sesión en tu cuenta</h2>
          <p style={{ fontSize: 14, color: "var(--fg-2)", margin: 0, lineHeight: 1.55 }}>
            Accede a tu historia clínica, próximas citas y consentimientos firmados.
          </p>
          <form style={{ display: "grid", gap: 12, marginTop: 8 }} onSubmit={(e) => e.preventDefault()}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)" }}>Correo electrónico</label>
              <input className="dp-input" placeholder="nombre@correo.com" style={{ marginTop: 6 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-1)" }}>Contraseña</label>
              <input className="dp-input" type="password" placeholder="••••••••" style={{ marginTop: 6 }} />
            </div>
            <a href="#" style={{ fontSize: 12, color: "var(--color-brand-teal)", textDecoration: "none", fontWeight: 600 }}>¿Olvidaste tu contraseña?</a>
            <button type="submit" className="dp-btn dp-btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>Iniciar sesión</button>
          </form>
          <p style={{ fontSize: 12, color: "var(--fg-3)", margin: 0 }}>
            ¿Eres nuevo? <a href="#agenda" className="dp-link">Agenda tu primera cita</a>.
          </p>
        </div>
        <div style={{
          background: "var(--gradient-brand)", color: "#fff",
          padding: 40, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 24,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Portal seguro</p>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: "10px 0 0", lineHeight: 1.25 }}>
              Toda tu información clínica, en un solo lugar.
            </h3>
          </div>
          <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14, fontSize: 13 }}>
            <li style={lFeat}><LCal size={20} /> Próximas citas y recordatorios</li>
            <li style={lFeat}><LTooth size={20} /> Historia clínica y tratamientos</li>
            <li style={lFeat}><LShield size={20} /> Consentimientos firmados</li>
          </ul>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(230,244,255,0.85)" }}>
            ¿Eres profesional o recepcionista? Usa el mismo formulario con tus credenciales.
          </p>
        </div>
      </div>
    </div>
  );
}

function DPFloatingActions() {
  return (
    <div className="dp-floating">
      <a href="https://wa.me/573237968435" className="dp-floating-btn dp-floating-whatsapp" aria-label="WhatsApp" target="_blank" rel="noopener">
        <FWa size={26} />
      </a>
      <a href="tel:+573237968435" className="dp-floating-btn" aria-label="Llamar">
        <FPhone size={22} />
      </a>
    </div>
  );
}

window.DPLoginModal = DPLoginModal;
window.DPFloatingActions = DPFloatingActions;
