export default function InfoBar() {
  return (
    <div className="infobar">
      <div className="container" style={{display:"flex",justifyContent:"space-between",gap:16}}>
        <small className="muted">📍 Av. Principal 123, Bogotá</small>
        <small className="muted">⏰ Lun–Vie 9–18h · Sáb 9–13h</small>
      </div>
    </div>
  );
}
