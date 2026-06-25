// DentPro Marketing — Contact + footer
const { Phone: CPhone, WhatsappLogo: CWa, EnvelopeSimple: CMail, MapPin: CMap, Headset: CHs, ChartLineUp: CChart, Medal: CMedal, InstagramLogo: CIg, FacebookLogo: CFb, TiktokLogo: CTt } = window.DPIcons;

function DPContact() {
  return (
    <section id="contacto" className="dp-section" style={{ background: "#fff" }}>
      <div className="dp-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        <div>
          <span className="dp-badge">Patient Care DentPro</span>
          <h2 style={{ fontSize: 30, fontWeight: 700, color: "var(--fg-1)", margin: "16px 0 12px" }}>Estamos para ayudarte</h2>
          <p style={{ fontSize: 17, color: "var(--fg-2)", margin: 0, lineHeight: 1.55 }}>
            Comunícate con nuestro equipo y programa tu cita en la sede DentPro Colombia de Chía.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 24 }}>
            {[
              { Icon: CPhone, label: "Teléfono", value: "+57 323 796 8435" },
              { Icon: CWa, label: "WhatsApp", value: "323 796 8435" },
              { Icon: CMail, label: "Email", value: "dentprocolombia@gmail.com" },
              { Icon: CMap, label: "Ubicación", value: "Cra. 7 #13-180, Chía" },
            ].map((c) => (
              <div key={c.label} className="dp-card" style={{ padding: 18, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span className="dp-icon-badge"><c.Icon size={20} /></span>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{c.label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-1)", fontWeight: 600 }}>{c.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 12, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, margin: 0 }}>Te acompañamos</p>
            <ul style={{ padding: 0, margin: "12px 0 0", listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { Icon: CHs, text: "Coordinación de citas y especialistas" },
                { Icon: CChart, text: "Seguimiento de tu evolución clínica" },
                { Icon: CMedal, text: "Garantía extendida en tratamientos" },
              ].map((s, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--fg-2)" }}>
                  <span style={{ color: "var(--color-brand-teal)" }}><s.Icon size={18} /></span>
                  {s.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{
          borderRadius: 28, overflow: "hidden",
          border: "1px solid var(--border-1)",
          background: "linear-gradient(135deg, #e6f4ff 0%, #c9e6fb 100%)",
          minHeight: 360,
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 24px 50px -25px rgba(15,23,42,0.18)",
        }}>
          <div style={{ textAlign: "center", color: "var(--color-brand-teal)" }}>
            <CMap size={64} />
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--fg-2)" }}>Google Maps · Chía, Cundinamarca</p>
          </div>
          <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, padding: 16, background: "rgba(255,255,255,0.95)", borderRadius: 16, fontSize: 13, color: "var(--fg-2)", boxShadow: "0 6px 20px rgba(15,23,42,0.08)" }}>
            <p style={{ margin: 0, fontWeight: 600, color: "var(--fg-1)" }}>DentPro Chía</p>
            <p style={{ margin: "4px 0 0", fontSize: 12 }}>Cra. 7 #13-180. Domingos y festivos con cita previa.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DPFooter() {
  return (
    <footer className="dp-footer">
      <div className="dp-container" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 48 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="../../assets/logo-light-blue.png"
              alt="DentPro Colombia"
              style={{ height: 56, filter: "brightness(0) invert(1)" }}
            />
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 16, maxWidth: 360, lineHeight: 1.55 }}>
            Odontología integral especializada en ortodoncia. Atendemos en Chía, Cundinamarca, con horario extendido y agendamiento en línea.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {[CIg, CFb, CTt].map((Icon, i) => (
              <a key={i} href="#" style={{ width: 40, height: 40, borderRadius: 9999, border: "1px solid rgba(255,255,255,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--color-accent-cyan)", margin: 0 }}>Servicios</p>
          <ul style={{ padding: 0, margin: "16px 0 0", listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            {["Limpieza", "Ortodoncia", "Implantes", "Estética", "Endodoncia", "Odontopediatría"].map((s) => <li key={s}><a href="#servicios">{s}</a></li>)}
          </ul>
        </div>
        <div>
          <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, color: "var(--color-accent-cyan)", margin: 0 }}>Contacto</p>
          <ul style={{ padding: 0, margin: "16px 0 0", listStyle: "none", display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <li>Cra. 7 #13-180, Chía</li>
            <li>+57 323 796 8435</li>
            <li>dentprocolombia@gmail.com</li>
            <li>Lun–Sáb 8:00–19:00</li>
          </ul>
        </div>
      </div>
      <div className="dp-container" style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
        <span>© 2026 DentPro Colombia. Todos los derechos reservados.</span>
        <div style={{ display: "flex", gap: 18 }}>
          <a href="#">Política de datos</a>
          <a href="#">Términos y condiciones</a>
        </div>
      </div>
    </footer>
  );
}

window.DPContact = DPContact;
window.DPFooter = DPFooter;
