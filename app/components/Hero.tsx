import Image from "next/image";
export default function Hero() {
  return (
    <section className="hero">
      <div className="container grid grid-2">
        <div className="card">
          <span className="badge">Odontología integral</span>
          <h1 style={{margin:"8px 0 12px"}}>Tu sonrisa, nuestra prioridad</h1>
          <p className="muted">Diagnóstico preciso, tratamientos modernos y seguimiento personalizado.</p>
          <div style={{marginTop:16,display:"flex",gap:12}}>
            <a href="#booking" className="btn btn-primary">Reservar turno</a>
            <a href="#services" className="btn">Ver servicios</a>
          </div>
        </div>
        <div className="card" style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Image alt="Clínica dental" width={720} height={480}
            src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80"/>
        </div>
      </div>
    </section>
  );
}
