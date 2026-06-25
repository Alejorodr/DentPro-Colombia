// DentPro Marketing — Navbar
// Mirrors app/(marketing)/components/Navbar.tsx
const { UserCircle, SignIn, List, Sun, Moon } = window.DPIcons;

function DPNavbar({ onLogin, onTheme, theme }) {
  const links = [
    { href: "#servicios", label: "Servicios" },
    { href: "#especialistas", label: "Especialistas" },
    { href: "#agenda", label: "Agenda" },
    { href: "#contacto", label: "Contacto" },
  ];
  return (
    <header className="dp-topbar">
      <div className="dp-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <img src="../../assets/logo-full-color.png" alt="DentPro Colombia" style={{ height: 44, objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--color-brand-teal)" }}>DentPro Colombia</span>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Odontología especializada · Chía</span>
          </div>
        </a>
        <nav style={{ display: "flex", alignItems: "center", gap: 32 }} className="dp-nav-links">
          {links.map((l) => (
            <a key={l.href} href={l.href} style={{
              fontSize: 14, fontWeight: 600, color: "var(--fg-2)", textDecoration: "none",
              transition: "color 0.2s",
            }} onMouseEnter={e => e.target.style.color = "var(--color-brand-teal)"} onMouseLeave={e => e.target.style.color = "var(--fg-2)"}>
              {l.label}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onTheme} aria-label="Cambiar tema" style={{
            width: 40, height: 40, borderRadius: 9999, background: "transparent",
            border: "1px solid var(--border-1)", color: "var(--fg-3)", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onLogin} className="dp-btn dp-btn-secondary" style={{ padding: "10px 16px" }}>
            <UserCircle size={18} />
            Iniciar sesión
            <SignIn size={14} />
          </button>
          <a href="#agenda" className="dp-btn dp-btn-primary">Agenda tu cita</a>
        </div>
      </div>
    </header>
  );
}

window.DPNavbar = DPNavbar;
