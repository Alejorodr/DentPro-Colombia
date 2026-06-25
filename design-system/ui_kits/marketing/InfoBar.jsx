// DentPro Marketing — InfoBar
// Mirrors app/(marketing)/components/InfoBar.tsx
const { MapPin, Clock, ChatCircleDots, EnvelopeSimple, InstagramLogo, FacebookLogo, TiktokLogo } = window.DPIcons;

function DPInfoBar() {
  return (
    <div className="dp-info-bar">
      <div className="dp-container" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 22 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(230,244,255,0.8)", color: "var(--color-brand-indigo)",
            padding: "5px 12px", borderRadius: 9999,
            fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
          }}>
            <MapPin size={14} />
            Cra. 7 #13-180, Chía, Cundinamarca
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-3)" }}>
            <Clock size={14} />
            Lun–Sáb 8:00–19:00 · Domingos y festivos con cita previa
          </span>
          <a href="https://wa.me/573237968435" target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--color-brand-teal)", fontWeight: 600, textDecoration: "none" }}>
            <ChatCircleDots size={18} />
            Agenda por WhatsApp
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="mailto:dentprocolombia@gmail.com" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-3)", textDecoration: "none", fontWeight: 500 }}>
            <EnvelopeSimple size={14} />
            dentprocolombia@gmail.com
          </a>
          <div style={{ display: "flex", gap: 8 }}>
            {[InstagramLogo, FacebookLogo, TiktokLogo].map((Icon, i) => (
              <a key={i} href="#" style={{
                width: 32, height: 32, borderRadius: 9999,
                border: "1px solid rgba(226,232,240,0.8)",
                color: "var(--fg-3)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.DPInfoBar = DPInfoBar;
