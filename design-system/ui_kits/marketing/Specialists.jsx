// DentPro Marketing — Specialists Slider
const { CaretLeft: SpL, CaretRight: SpR } = window.DPIcons;

const SPECIALISTS = [
  { name: "Dra. Laura López", specialty: "Ortodoncia", description: "Máster en ortodoncia digital y certificada en alineadores invisibles.", initials: "LL" },
  { name: "Dr. Andrés Pérez", specialty: "Implantología", description: "Especialista en cirugía oral con más de 10 años de experiencia en rehabilitación fija.", initials: "AP" },
  { name: "Dra. Camila Ruiz", specialty: "Endodoncia", description: "Tratamientos mínimamente invasivos apoyados en microscopía clínica.", initials: "CR" },
  { name: "Dr. Daniel Kim", specialty: "Estética dental", description: "Especialista en diseño de sonrisa integral y rehabilitación estética.", initials: "DK" },
];

function DPSpecialists() {
  const [idx, setIdx] = React.useState(0);
  const max = SPECIALISTS.length - 3;
  return (
    <section id="especialistas" className="dp-section" style={{ background: "var(--color-brand-light)" }}>
      <div className="dp-container">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 560 }}>
            <span className="dp-badge">Equipo clínico</span>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "var(--fg-1)", margin: "16px 0 12px" }}>
              Especialistas que cuidan tu sonrisa
            </h2>
            <p style={{ fontSize: 17, color: "var(--fg-2)", margin: 0, lineHeight: 1.55 }}>
              Conoce a nuestro equipo multidisciplinario, listo para acompañarte en cada fase del tratamiento.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="dp-slider-btn" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} aria-label="Anterior"><SpL size={20} /></button>
            <button className="dp-slider-btn" onClick={() => setIdx(Math.min(max, idx + 1))} disabled={idx >= max} aria-label="Siguiente"><SpR size={20} /></button>
          </div>
        </div>
        <div className="dp-slider">
          <div className="dp-slider-track" style={{ transform: `translateX(-${idx * 344}px)` }}>
            {SPECIALISTS.map((s) => (
              <article key={s.name} className="dp-card dp-specialist" style={{ background: "#fff" }}>
                <div className="dp-specialist-photo" style={{
                  background: "var(--gradient-tooth-photo)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(255,255,255,0.95)", fontWeight: 700, fontSize: 64, letterSpacing: "0.02em",
                  fontFamily: "var(--font-sans)",
                }}>
                  {s.initials}
                </div>
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg-1)", margin: 0 }}>{s.name}</h3>
                  <p style={{ fontSize: 13, color: "var(--color-brand-teal)", margin: "4px 0 0", fontWeight: 600 }}>{s.specialty}</p>
                  <p style={{ fontSize: 13, color: "var(--fg-2)", margin: "10px 0 0", lineHeight: 1.5 }}>{s.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

window.DPSpecialists = DPSpecialists;
