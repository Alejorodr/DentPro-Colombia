// DentPro Marketing — Services
// Mirrors app/(marketing)/components/Services.tsx
const { Sparkle: SSparkle, Smiley, Stethoscope, DiamondsFour, Tooth, Baby, CheckCircle: SCheck } = window.DPIcons;

const DP_SERVICES = [
  {
    title: "Limpieza y profilaxis",
    description: "Higiene profesional con ultrasonido y pulido remineralizante.",
    Icon: SSparkle,
    highlights: ["Profilaxis guiada por imagen", "Educación en hábitos de cuidado", "Revisión preventiva semestral"],
  },
  {
    title: "Ortodoncia digital",
    description: "Alineadores invisibles y brackets autoligables según tus objetivos.",
    Icon: Smiley,
    highlights: ["Escaneo 3D en la primera visita", "Planificación con simulación virtual", "Controles mensuales personalizados"],
  },
  {
    title: "Implantes y cirugía",
    description: "Rehabilitación fija con implantes guiados por computadora.",
    Icon: Stethoscope,
    highlights: ["Guías quirúrgicas impresas en 3D", "Implantes certificados internacionales", "Sedación consciente disponible"],
  },
  {
    title: "Estética dental",
    description: "Carillas cerámicas, blanqueamiento y diseño de sonrisa armónico.",
    Icon: DiamondsFour,
    highlights: ["Mockup digital previo al tratamiento", "Laboratorio especializado premium", "Resultados naturales y duraderos"],
  },
  {
    title: "Endodoncia avanzada",
    description: "Tratamientos de conducto con microscopio y obturación termoplástica.",
    Icon: Tooth,
    highlights: ["Diagnóstico por CBCT", "Instrumentación rotatoria", "Seguimiento clínico postoperatorio"],
  },
  {
    title: "Odontopediatría",
    description: "Prevención y tratamientos amigables para los más pequeños.",
    Icon: Baby,
    highlights: ["Ambientes adaptados para niños", "Sellantes y flúor profesional", "Educación en hábitos de higiene"],
  },
];

function DPServices() {
  return (
    <section id="servicios" className="dp-section" style={{ background: "#fff" }}>
      <div className="dp-container">
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 48px" }}>
          <h2 style={{ fontSize: 30, fontWeight: 700, color: "var(--fg-1)", margin: 0 }}>
            Tratamientos personalizados para cada etapa
          </h2>
          <p style={{ fontSize: 18, color: "var(--fg-2)", marginTop: 12, lineHeight: 1.55 }}>
            Desde prevención hasta rehabilitación avanzada, diseñamos planes odontológicos a tu medida.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
          {DP_SERVICES.map((s) => (
            <article key={s.title} className="dp-card" style={{ padding: 28 }}>
              <span className="dp-icon-circle"><s.Icon size={26} /></span>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--fg-1)", margin: "20px 0 8px" }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "var(--fg-2)", margin: 0, lineHeight: 1.55 }}>{s.description}</p>
              <ul className="dp-checklist">
                {s.highlights.map((h) => (
                  <li key={h}><SCheck size={16} /> <span>{h}</span></li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

window.DPServices = DPServices;
