"use client";

import { useEffect, useState } from "react";

import { List, SignIn, UserCircle, X } from "@/components/ui/Icon";

import { ThemeToggle } from "@/components/ThemeToggle";
import PwaInstallButton from "@/components/PwaInstallButton";

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  brand: {
    href: string;
    name: string;
    initials: string;
  };
  links: NavLink[];
  cta: {
    href: string;
    label: string;
  };
  login?: {
    href: string;
    label: string;
  };
}

export function Navbar({ brand, links, cta, login }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className={`topbar transition-shadow duration-300 ${scrolled ? "shadow-lg shadow-slate-900/8 dark:shadow-surface-dark/60" : ""}`}>
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <a href={brand.href} className="flex items-center gap-3 text-lg font-semibold text-brand-teal dark:text-accent-cyan">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-teal text-white">
            {brand.initials}
          </span>
          {brand.name}
        </a>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 lg:flex dark:text-slate-200">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-brand-teal dark:hover:text-accent-cyan"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <PwaInstallButton className="hidden lg:inline-flex" />
          <ThemeToggle />
          {login ? (
            <a
              href={login.href}
              className="btn-secondary inline-flex h-11 items-center justify-center gap-2 rounded-full px-4"
              aria-label={login.label}
            >
              <UserCircle className="h-5 w-5" weight="bold" aria-hidden="true" />
              <span className="hidden text-sm font-semibold lg:inline">{login.label}</span>
              <SignIn className="hidden h-4 w-4 lg:inline" weight="bold" aria-hidden="true" />
            </a>
          ) : null}
          <a href={cta.href} className="btn-primary hidden lg:inline-flex">
            {cta.label}
          </a>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 lg:hidden"
            id="mobileMenuBtn"
            aria-controls="mobileMenu"
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isOpen}
            onClick={toggleMenu}
          >
            {isOpen ? (
              <X className="h-6 w-6" weight="bold" aria-hidden="true" />
            ) : (
              <List className="h-6 w-6" weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {isOpen ? (
        <div className="mobile-menu open dark:bg-surface-base/95" id="mobileMenu">
          <nav className="flex flex-col gap-4 px-6 pb-6 text-base font-semibold text-slate-700 dark:text-slate-100">
            {links.map((link) => (
              <a
                key={`mobile-${link.href}`}
                href={link.href}
                className="transition hover:text-brand-teal dark:hover:text-accent-cyan"
                onClick={closeMenu}
              >
                {link.label}
              </a>
            ))}
            {login ? (
              <a href={login.href} className="btn-secondary text-center" onClick={closeMenu}>
                {login.label}
              </a>
            ) : null}
            <a href={cta.href} className="btn-primary" onClick={closeMenu}>
              {cta.label}
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
