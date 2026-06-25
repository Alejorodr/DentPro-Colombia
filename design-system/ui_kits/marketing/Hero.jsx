// DentPro Marketing — Hero
// Mirrors app/(marketing)/components/Hero.tsx
const { Sparkle: HSparkle, CheckCircle: HCheck } = window.DPIcons;

function DPHero() {
  return (
    <section className="dp-hero-bg" style={{ padding: "64px 0 96px", position: "relative", overflow: "hidden" }}>
      <div className="dp-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative", zIndex: 1 }}>
          <span style={{
            display: "inline-flex", alignItems: "center",
            background: "rgba(255,255,255,0.75)",
            padding: "8px 18px", borderRadius: 9999,
            fontSize: 12, fontWeight: 600, color: "var(--color-brand-indigo)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            alignSelf: "flex-start",
            boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          }}>
            Odontología general y especializada en Chía
          </span>
          <h1 style={{
            fontSize: 48, fontWeight: 700, lineHeight: 1.1,
            color: "var(--fg-1)", margin: 0, letterSpacing: "-0.01em",
            maxWidth: 520,
          }}>
            Cuidamos tu sonrisa con tecnología y calidez humana
          </h1>
          <p style={{ fontSize: 18, color: "var(--fg-2)", margin: 0, maxWidth: 480, lineHeight: 1.55 }}>
            Agenda tu valoración en DentPro Colombia y accede a tratamientos preventivos y especializados sin salir de Chía.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#agenda" className="dp-btn dp-btn-primary">Ver disponibilidad</a>
            <a href="#agenda" className="dp-btn dp-btn-secondary">Te contactamos</a>
          </div>
          <dl className="dp-stat-grid">
            <div className="dp-stat"><dt>+2.500 sonrisas</dt><dd>atendidas en Cundinamarca</dd></div>
            <div className="dp-stat"><dt>98% satisfacción</dt><dd>de nuestros pacientes</dd></div>
            <div className="dp-stat"><dt>Horario extendido</dt><dd>Lun–Sáb 8:00 am a 7:00 pm</dd></div>
          </dl>
        </div>
        <div style={{ position: "relative", maxWidth: 480, marginLeft: "auto" }}>
          <div className="dp-card" style={{ padding: 24 }}>
            <div style={{
              aspectRatio: "4 / 5",
              borderRadius: 20,
              overflow: "hidden",
              background: "var(--gradient-tooth-photo)",
              position: "relative",
              boxShadow: "inset 0 0 40px rgba(15,23,42,0.18)",
            }}>
              <img
                src="../../assets/storefront-team.png"
                alt="Equipo DentPro Chía"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <div style={{
              marginTop: 20, padding: 18, borderRadius: 18,
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 8px 24px -10px rgba(15,23,42,0.12)",
              border: "1px solid rgba(255,255,255,0.7)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ display: "inline-flex", color: "#f5a623" }}>
                  {[0,1,2,3,4].map(i => <HSparkle key={i} size={14} />)}
                </span>
                <span style={{ fontSize: 12, color: "var(--fg-3)" }}>5.0 · Google</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>
                "Desde que llegué a DentPro Chía me guiaron en todo el proceso. El equipo es cercano y muy profesional."
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--fg-4)" }}>
                Mariana López · Paciente de ortodoncia
              </p>
            </div>
          </div>
          <div className="dp-card" style={{
            position: "absolute", right: -8, bottom: -56,
            width: 220, padding: 18,
            boxShadow: "var(--shadow-glow)",
          }}>
            <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", fontWeight: 600 }}>
              Indicadores clínicos
            </p>
            <p style={{ margin: "6px 0 4px", fontSize: 22, fontWeight: 700, color: "var(--color-brand-indigo)" }}>
              Seguimiento personalizado
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--fg-3)" }}>
              Control clínico y acompañamiento en cada etapa
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

window.DPHero = DPHero;
