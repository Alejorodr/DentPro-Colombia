export default function Services() {
  const items = [
    {t:"Limpieza y profilaxis",d:"Higiene profesional y prevención"},
    {t:"Ortodoncia",d:"Alineación y corrección de mordida"},
    {t:"Implantes",d:"Reemplazo definitivo de piezas"},
    {t:"Estética dental",d:"Carillas, blanqueamiento y más"},
    {t:"Endodoncia",d:"Tratamientos de conducto"},
    {t:"Odontopediatría",d:"Cuidado para los más chicos"},
  ];
  return (
    <section id="services" className="container">
      <h2 style={{marginBottom:12}}>Servicios</h2>
      <div className="grid grid-3">
        {items.map((x,i)=>(
          <article className="card" key={i}>
            <h3 style={{margin:"0 0 6px"}}>{x.t}</h3>
            <p className="muted">{x.d}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
