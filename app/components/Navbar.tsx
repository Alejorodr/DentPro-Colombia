"use client";
import Link from "next/link";
export default function Navbar() {
  return (
    <nav className="nav">
      <div className="inner">
        <Link href="/" style={{fontWeight:700}}>DentPro</Link>
        <div className="links">
          <a href="#services">Servicios</a>
          <a href="#team">Especialistas</a>
          <a href="#contact">Contacto</a>
          <button id="darkModeToggle" className="btn" title="Tema"><span className="material-symbols-outlined">dark_mode</span></button>
          <Link href="/login" className="btn btn-primary">Login</Link>
          <a href="#booking" className="btn">Agenda ahora</a>
        </div>
      </div>
    </nav>
  );
}
