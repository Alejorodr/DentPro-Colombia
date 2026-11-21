"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import "@/components/ui/glassy-dashboard.css";

import { ThemeToggle } from "@/components/ThemeToggle";
import { GlassyDock } from "@/components/ui/GlassyDock";
import { List, SignOut, Tooth, WhatsappLogo, X, type Icon as IconComponent } from "@/components/ui/Icon";
import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
import { resolveActiveHref } from "@/app/portal/components/layout/Sidebar";

type NavItem = { label: string; href: string; icon: IconComponent };

type AdminGlassShellProps = {
  children: ReactNode;
  navItems: NavItem[];
  settingsItems: NavItem[];
  pathname: string;
  /** Query string actual (sin `?`), para resolver entradas con filtros. */
  search: string;
  userName: string;
  onSignOut: () => void;
  searchSlot?: ReactNode;
  notificationsSlot?: ReactNode;
};

/**
 * Shell "glassy" del portal administrador: fondo de gradiente de marca, barra superior en
 * píldora, dock lateral con indicador deslizante y un escenario de vidrio para cada página.
 */
export function AdminGlassShell({
  children,
  navItems,
  settingsItems,
  pathname,
  search,
  userName,
  onSignOut,
  searchSlot,
  notificationsSlot,
}: AdminGlassShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const entries = [...navItems, ...settingsItems];
  const activeHref = resolveActiveHref(pathname, search, entries);

  const dockItems = entries.map((item) => ({
    key: item.href,
    href: item.href,
    label: item.label,
    icon: item.icon,
    active: item.href === activeHref,
  }));

  return (
    <div className="gd-app">
      <div className="gd-backdrop" aria-hidden="true">
        <span className="gd-orb gd-orb-a" />
        <span className="gd-orb gd-orb-b" />
        <span className="gd-orb gd-orb-c" />
      </div>

      <div className="gd-surround">
        <header className="gd-top gd-glass">
          <Link href="/portal/admin" className="gd-brand" aria-label="DentPro, inicio del portal administrador">
            <span className="gd-logo" aria-hidden="true">
              <Tooth size={20} />
            </span>
            <span>
              <strong>DentPro</strong>
              <small>Portal administrador</small>
            </span>
          </Link>

          <div className="gd-top-search">{searchSlot}</div>

          <div className="gd-top-actions">
            <ThemeToggle />
            {notificationsSlot}
            <a
              href="https://wa.me/573237968435"
              target="_blank"
              rel="noopener noreferrer"
              className="gd-hide-sm"
              aria-label="Soporte por WhatsApp"
              title="Soporte por WhatsApp"
            >
              <WhatsappLogo aria-hidden="true" />
            </a>
            <div className="gd-user gd-hide-sm" title={userName}>
              <AvatarFallback name={userName} className="h-9 w-9" />
              <span>{userName}</span>
            </div>
            <button
              type="button"
              className="gd-menu-button"
              aria-label="Abrir menú"
              title="Abrir menú"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <List aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="gd-layout">
          <GlassyDock
            variant="side"
            ariaLabel="Navegación del portal administrador"
            items={dockItems}
            footer={
              <button type="button" aria-label="Cerrar sesión" onClick={onSignOut}>
                <SignOut size={19} aria-hidden="true" />
                <span className="gd-dock-tip" aria-hidden="true">
                  Cerrar sesión
                </span>
              </button>
            }
          />
          <main className="gd-stage" id="contenido">
            <div className="gd-page gd-legacy">
              {children}
            </div>
          </main>
        </div>

        <footer className="gd-footer">
          <span>DentPro Colombia · Chía, Cundinamarca</span>
          <Link href="/">Ver sitio público</Link>
        </footer>
      </div>

      {menuOpen ? (
        <MobileMenu items={dockItems} userName={userName} onSignOut={onSignOut} close={() => setMenuOpen(false)} />
      ) : null}
    </div>
  );
}

function MobileMenu({
  items,
  userName,
  onSignOut,
  close,
}: {
  items: { key: string; href: string; label: string; icon: IconComponent; active: boolean }[];
  userName: string;
  onSignOut: () => void;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="gd-sheet"
      aria-label="Menú del portal administrador"
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="gd-sheet-inner">
        <header>
          <div className="gd-user">
            <AvatarFallback name={userName} className="h-9 w-9" />
            <span>{userName}</span>
          </div>
          <button type="button" className="gd-icon-button" aria-label="Cerrar menú" onClick={() => ref.current?.close()}>
            <X aria-hidden="true" />
          </button>
        </header>
        <nav aria-label="Navegación del portal administrador">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link key={item.key} href={item.href} aria-current={item.active ? "page" : undefined} onClick={() => ref.current?.close()}>
                <ItemIcon aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <a href="https://wa.me/573237968435" target="_blank" rel="noopener noreferrer">
            <WhatsappLogo aria-hidden="true" />
            Soporte por WhatsApp
          </a>
          <button type="button" onClick={onSignOut}>
            <SignOut aria-hidden="true" />
            Cerrar sesión
          </button>
        </nav>
      </div>
    </dialog>
  );
}

export default AdminGlassShell;
