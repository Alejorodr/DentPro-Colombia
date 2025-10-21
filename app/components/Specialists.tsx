"use client";
export default function Specialists() {
  const people = [
    {n:"Dra. López",s:"Ortodoncia"},
    {n:"Dr. Pérez",s:"Implantes"},
    {n:"Dra. Ruiz",s:"Endodoncia"},
    {n:"Dr. Kim",s:"Estética"},
  ];
  return (
    <section id="team" className="container">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2>Especialistas</h2>
        <div style={{display:"flex",gap:8}}>
          <button id="prevSpec" className="btn" aria-label="Prev">◀</button>
          <button id="nextSpec" className="btn" aria-label="Next">▶</button>
        </div>
      </div>
      <div className="specialists card">
        <div id="specialistsTrack" className="track">
          {people.map((p,i)=>(
            <div className="card" style={{minWidth:260}} key={i}>
              <h3 style={{margin:"0 0 4px"}}>{p.n}</h3>
              <p className="muted">{p.s}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="dotbar">
        {people.map((_,i)=>(<div key={i} className="dot"></div>))}
      </div>
    </section>
  );
}
