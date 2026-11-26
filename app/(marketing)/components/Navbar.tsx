"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { MorphToggleIcon, UserCircle } from "@/components/ui/Icon";

import { ThemeToggle } from "@/components/ThemeToggle";

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  brand: {
    href: string;
    name: string;
    initials: string;
    logoUrl?: string;
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
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        {/* DOG-62: en celular el nombre ocupa a lo sumo 2 líneas y cede espacio a los botones. */}
        <a
          href={brand.href}
          className="flex min-w-0 items-center gap-2 text-base font-semibold leading-tight text-brand-teal sm:gap-3 sm:text-lg dark:text-accent-cyan"
        >
          {brand.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt={brand.name}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full object-contain"
            />
          ) : (
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white">
              {brand.initials}
            </span>
          )}
          <span className="line-clamp-2">{brand.name}</span>
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          {login ? (
            <a
              href={login.href}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted dark:text-slate-300 dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
              aria-label={login.label}
            >
              <UserCircle className="h-5 w-5" weight="bold" aria-hidden="true" />
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
            <MorphToggleIcon name="menu" active={isOpen} className="h-6 w-6" weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
      {isOpen ? (
        <div className="mobile-menu open" id="mobileMenu">
          <nav className="flex flex-col gap-4 px-6 py-6 text-base font-semibold text-slate-700 dark:text-slate-100">
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
