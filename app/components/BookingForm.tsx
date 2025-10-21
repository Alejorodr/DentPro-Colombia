"use client";
export default function BookingForm() {
  return (
    <section id="booking" className="container">
      <h2>Agenda tu turno</h2>
      <form id="bookingForm" className="card">
        <div className="row">
          <div style={{flex:1}}>
            <label>Nombre</label>
            <input name="name" placeholder="Nombre y apellido" required/>
          </div>
          <div style={{flex:1}}>
            <label>Teléfono</label>
            <input name="phone" placeholder="+57 ..." required/>
          </div>
        </div>
        <div className="row">
          <div style={{flex:1}}>
            <label>Fecha</label>
            <input name="date" type="date" required/>
          </div>
          <div style={{flex:1}}>
            <label>Hora</label>
            <input name="time" type="time" required/>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <label>Comentario</label>
          <textarea name="note" rows={3} placeholder="Motivo de la consulta" />
        </div>
        <div style={{marginTop:16,display:"flex",gap:12}}>
          <button className="btn btn-primary" type="submit">Solicitar</button>
          <small className="muted">Te contactaremos para confirmar.</small>
        </div>
      </form>
    </section>
  );
}
