export default function ContactSection() {
  return (
    <section id="contact" className="container grid grid-2">
      <div className="card">
        <h2>Contacto</h2>
        <p className="muted">Whatsapp, teléfono o email. Respuesta en horario laboral.</p>
        <p>📞 <a href="tel:+573001112233">+57 300 111 2233</a></p>
        <p>✉️ <a href="mailto:info@dentpro.co">info@dentpro.co</a></p>
        <p>📍 Av. Principal 123, Bogotá</p>
      </div>
      <div className="card">
        <h3>Horarios</h3>
        <p>Lun–Vie 9–18h · Sáb 9–13h</p>
        <h3 style={{marginTop:12}}>Cobertura</h3>
        <p>Obras sociales y particular</p>
      </div>
    </section>
  );
}
