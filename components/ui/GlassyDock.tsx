"use client";

import Link from "next/link";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

import type { Icon as IconComponent } from "@/components/ui/Icon";

export type GlassyDockItem = {
  key: string;
  href: string;
  label: string;
  /** Etiqueta corta para el dock inferior en móvil. */
  short?: string;
  icon: IconComponent;
  active: boolean;
  /** Si se define, el clic se intercepta (p. ej. vistas por hash) en lugar de navegar. */
  onSelect?: () => void;
};

type GlassyDockProps = {
  items: GlassyDockItem[];
  variant: "side" | "bottom";
  ariaLabel: string;
  className?: string;
  /** Contenido adicional al final del dock (p. ej. cerrar sesión), tras un separador. */
  footer?: ReactNode;
};

/**
 * Dock de vidrio con indicador deslizante (la "píldora" blanca que sigue a la opción activa).
 * El indicador se recalcula con ResizeObserver para soportar cambios de tamaño y de fuente.
 */
export function GlassyDock({ items, variant, ariaLabel, className = "", footer }: GlassyDockProps) {
  const nav = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const activeKey = items.find((item) => item.active)?.key ?? null;

  useEffect(() => {
    const container = nav.current;
    const indicator = marker.current;
    if (!container || !indicator) return;

    const adjust = () => {
      const current = container.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current) {
        indicator.style.opacity = "0";
        return;
      }
      indicator.style.opacity = "1";
      indicator.style.width = `${current.offsetWidth}px`;
      indicator.style.height = `${current.offsetHeight}px`;
      indicator.style.transform = `translate(${current.offsetLeft}px, ${current.offsetTop}px)`;
      // Activa la transición solo después del primer posicionamiento, para que no "vuele" al cargar.
      requestAnimationFrame(() => {
        indicator.dataset.ready = "true";
      });
    };

    const observer = new ResizeObserver(adjust);
    observer.observe(container);
    container.querySelectorAll("a").forEach((link) => observer.observe(link));
    adjust();
    return () => observer.disconnect();
  }, [activeKey, items.length]);

  const intercept = (event: MouseEvent<HTMLAnchorElement>, item: GlassyDockItem) => {
    if (!item.onSelect) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    item.onSelect();
  };

  const side = variant === "side";

  return (
    <nav ref={nav} className={`gd-dock gd-glass ${side ? "gd-dock-side" : "gd-viewdock"} ${className}`} aria-label={ariaLabel}>
      <span ref={marker} className="gd-dock-indicator" aria-hidden="true" />
      {items.map((item) => {
        const ItemIcon = item.icon;
        const content = (
          <>
            <ItemIcon size={side ? 19 : 17} aria-hidden="true" />
            {side ? (
              <span className="gd-dock-tip" aria-hidden="true">
                {item.label}
              </span>
            ) : (
              <>
                <span className="gd-dock-text" aria-hidden="true">
                  {item.label}
                </span>
                <span className="gd-dock-short" aria-hidden="true">
                  {item.short ?? item.label}
                </span>
              </>
            )}
          </>
        );

        return item.onSelect ? (
          <a
            key={item.key}
            href={item.href}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
            onClick={(event) => intercept(event, item)}
          >
            {content}
          </a>
        ) : (
          <Link key={item.key} href={item.href} aria-label={item.label} aria-current={item.active ? "page" : undefined}>
            {content}
          </Link>
        );
      })}
      {footer ? (
        <>
          <span className="gd-dock-sep" aria-hidden="true" />
          {footer}
        </>
      ) : null}
    </nav>
  );
}
