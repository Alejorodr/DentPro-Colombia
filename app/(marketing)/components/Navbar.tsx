"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { List, UserCircle, X } from "@phosphor-icons/react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { LoginModal } from "./LoginModal";

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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);
  const toggleLoginModal = () => {
    setIsLoginModalOpen((prev) => {
      const next = !prev;
      if (next) {
        closeMenu();
      }
      return next;
    });
  };
  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    if (loginButtonRef.current) {
      loginButtonRef.current.focus();
    }
  };
  useEffect(() => {
    if (isOpen) {
      setIsLoginModalOpen(false);
    }
  }, [isOpen]);

  const authParam = searchParams.get("auth");

  useEffect(() => {
    if (authParam !== "1") {
      return;
    }

    setIsLoginModalOpen(true);
    setIsOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [authParam, pathname, router, searchParams]);

  return (
    <header className="topbar">
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
          <ThemeToggle />
          {login ? (
            <div className="relative">
              <button
                type="button"
                ref={loginButtonRef}
                className="btn-secondary inline-flex h-11 w-11 items-center justify-center rounded-full"
                aria-haspopup="dialog"
                aria-expanded={isLoginModalOpen}
                aria-controls="loginModal"
                aria-label={login.label}
                onClick={toggleLoginModal}
              >
                <UserCircle className="h-5 w-5" weight="bold" aria-hidden="true" />
              </button>
              <LoginModal open={isLoginModalOpen} onClose={closeLoginModal} />
            </div>
          ) : null}
          <a href={cta.href} className="btn-primary hidden lg:inline-flex">
            {cta.label}
          </a>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 lg:hidden"
            id="mobileMenuBtn"
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
      <div className={`mobile-menu dark:bg-surface-base/95 ${isOpen ? "open" : ""}`} id="mobileMenu">
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
          <a href={cta.href} className="btn-primary" onClick={closeMenu}>
            {cta.label}
          </a>
        </nav>
      </div>
    </header>
  );
}

