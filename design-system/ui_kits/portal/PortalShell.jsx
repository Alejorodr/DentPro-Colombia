// DentPro Portal — Shell (sidebar + topbar). Mirrors PortalShell.tsx structure.
const PI = window.DPIcons;

const NAV_BY_ROLE = {
  ADMINISTRADOR: {
    title: "DentPro Admin",
    subtitle: "Administrator portal",
    label: "Administrator",
    nav: [
      { key: "dashboard", label: "Dashboard", icon: PI.House },
      { key: "staff", label: "Staff Management", icon: PI.Users },
      { key: "patients", label: "Patient Records", icon: PI.Users },
      { key: "services", label: "Services & Pricing", icon: PI.ClipboardText },
      { key: "scheduling", label: "Scheduling Ops", icon: PI.CalendarCheck },
      { key: "content", label: "Content CMS", icon: PI.SquaresFour },
      { key: "templates", label: "Clinical Templates", icon: PI.ClipboardText },
      { key: "audit", label: "Audit Logs", icon: PI.ShieldCheck },
    ],
    settings: [{ key: "settings", label: "Settings", icon: PI.Gear }],
  },
  PROFESIONAL: {
    title: "DentPro",
    subtitle: "Profesional dashboard",
    label: "Profesional",
    nav: [
      { key: "agenda", label: "Agenda", icon: PI.CalendarCheck },
      { key: "patients", label: "Pacientes", icon: PI.Users },
      { key: "lab", label: "Resultados de laboratorio", icon: PI.ClipboardText },
      { key: "documents", label: "Documentos", icon: PI.FileText },
    ],
    settings: [{ key: "settings", label: "Configuración", icon: PI.Gear }],
  },
  PACIENTE: {
    title: "DentPro",
    subtitle: "Portal paciente",
    label: "Paciente",
    nav: [
      { key: "dashboard", label: "Dashboard", icon: PI.House },
      { key: "appointments", label: "Mis citas", icon: PI.CalendarCheck },
      { key: "history", label: "Historia clínica", icon: PI.ClockCounter },
      { key: "consents", label: "Consentimientos", icon: PI.FileText },
      { key: "profile", label: "Perfil", icon: PI.UserCircle },
    ],
    settings: [{ key: "settings", label: "Configuración", icon: PI.Gear }],
  },
  RECEPCIONISTA: {
    title: "DentPro",
    subtitle: "Receptionist dashboard",
    label: "Recepción",
    nav: [
      { key: "dashboard", label: "Dashboard", icon: PI.House },
      { key: "schedule", label: "Schedule", icon: PI.CalendarCheck },
      { key: "patients", label: "Patients", icon: PI.Users },
      { key: "staff", label: "Staff", icon: PI.Users },
      { key: "billing", label: "Billing", icon: PI.ClipboardText },
    ],
    settings: [{ key: "settings", label: "Settings", icon: PI.Gear }],
  },
};

function DPPortalShell({ role, activePage, onNavigate, onSwitchRole, userName, children, title, subtitle, extra }) {
  const config = NAV_BY_ROLE[role];
  return (
    <div className="pp-shell">
      <aside className="pp-sidebar">
        <div className="pp-brand">
          <span className="pp-monogram">DP</span>
          <div>
            <div className="pp-brand-title">{config.title}</div>
            <div className="pp-brand-sub">{config.subtitle}</div>
          </div>
        </div>
        <div className="pp-nav-group">
          <div className="pp-nav-section">{role === "ADMINISTRADOR" || role === "RECEPCIONISTA" ? "Navegación" : "Navegación"}</div>
          {config.nav.map((item) => (
            <button key={item.key}
              className={"pp-nav-item" + (activePage === item.key ? " active" : "")}
              onClick={() => onNavigate(item.key)}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="pp-nav-group">
          <div className="pp-nav-section">Ajustes</div>
          {config.settings.map((item) => (
            <button key={item.key} className={"pp-nav-item" + (activePage === item.key ? " active" : "")} onClick={() => onNavigate(item.key)}>
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
        <button className="pp-signout" onClick={() => onSwitchRole && onSwitchRole(null)}>
          <PI.SignOut size={18} /> Cerrar sesión
        </button>
      </aside>

      <div className="pp-main">
        <header className="pp-topbar">
          <div style={{ flex: "0 0 auto" }}>
            <div className="pp-topbar-title">{config.label}</div>
            <div className="pp-topbar-name">{title}</div>
            <div className="pp-topbar-sub">{subtitle}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="pp-search">
            <PI.MagnifyingGlass size={16} />
            <input placeholder={role === "ADMINISTRADOR" ? "Search patients, staff, services…" : "Buscar en el portal"} />
          </div>
          {extra}
          <button className="pp-icon-btn" aria-label="Notificaciones"><PI.Bell size={18} /></button>
          <button className="pp-icon-btn" aria-label="Ayuda"><PI.Question size={18} /></button>
          <div className="pp-avatar-pill">
            <span className="pp-avatar">{userName.split(" ").map(s => s[0]).slice(0, 2).join("")}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-1)" }}>{userName}</span>
          </div>
          {onSwitchRole && (
            <select value={role} onChange={(e) => onSwitchRole(e.target.value)} style={{
              padding: "8px 12px", borderRadius: 9999, border: "1px solid var(--border-1)",
              background: "var(--color-brand-light)", color: "var(--color-brand-teal)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
            }}>
              <option value="ADMINISTRADOR">Admin</option>
              <option value="PROFESIONAL">Profesional</option>
              <option value="PACIENTE">Paciente</option>
              <option value="RECEPCIONISTA">Recepción</option>
            </select>
          )}
        </header>
        <main className="pp-content">
          <div className="pp-content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

window.DPPortalShell = DPPortalShell;
window.DP_NAV_BY_ROLE = NAV_BY_ROLE;
