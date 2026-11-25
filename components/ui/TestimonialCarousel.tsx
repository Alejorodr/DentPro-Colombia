"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { motion, useReducedMotion, type PanInfo } from "motion/react";

import { CaretLeft, CaretRight, Star } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type Testimonial = {
  id: string;
  name: string;
  text: string;
  /** Foto del autor (p. ej. de Google). Sin foto se muestran sus iniciales. */
  avatar?: string;
  /** Calificación de 1 a 5; sin valor no se muestran estrellas. */
  rating?: number;
  /** Línea secundaria: "hace 2 semanas", "Paciente de ortodoncia"… */
  meta?: string;
  /** Perfil del autor; si existe, el nombre enlaza ahí. */
  href?: string;
};

type TestimonialCarouselProps = {
  testimonials: Testimonial[];
  /** Avance automático en ms; se pausa con el cursor o el foco encima. `0` lo desactiva. */
  autoPlayMs?: number;
  className?: string;
  label?: string;
};

const SWIPE_THRESHOLD_PX = 80;
const EXIT_DURATION_MS = 200;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Calificación: ${rating} de 5 estrellas`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn("h-4 w-4", index < filled
              ? "text-gold-bright [&_svg]:fill-current"
              : "text-slate-300 dark:text-slate-600 [&_svg]:fill-slate-200 dark:[&_svg]:fill-slate-700")}
          weight="fill"
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/**
 * Pila de tarjetas de testimonios que se descartan arrastrando (DOG-35). Basado en el
 * componente propuesto en el ticket, adaptado a DentPro: paleta de marca, `next/image`,
 * flechas y puntos como botones reales, teclado, avance automático con pausa y
 * `prefers-reduced-motion`.
 */
export function TestimonialCarousel({
  testimonials,
  autoPlayMs = 8000,
  className,
  label = "Reseñas de pacientes",
}: TestimonialCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = testimonials.length;

  const goTo = useCallback(
    (getNext: (current: number) => number, direction: 1 | -1) => {
      if (count < 2) return;
      if (prefersReducedMotion) {
        setCurrentIndex((current) => getNext(current));
        return;
      }
      setExitX(direction * -260);
      window.setTimeout(() => {
        setCurrentIndex((current) => getNext(current));
        setExitX(0);
      }, EXIT_DURATION_MS);
    },
    [count, prefersReducedMotion],
  );

  const next = useCallback(() => goTo((current) => (current + 1) % count, 1), [count, goTo]);
  const previous = useCallback(() => goTo((current) => (current - 1 + count) % count, -1), [count, goTo]);

  useEffect(() => {
    if (!autoPlayMs || paused || prefersReducedMotion || count < 2) return;
    const interval = window.setInterval(next, autoPlayMs);
    return () => window.clearInterval(interval);
  }, [autoPlayMs, paused, prefersReducedMotion, count, next]);

  if (count === 0) return null;

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_THRESHOLD_PX) next();
    else if (info.offset.x >= SWIPE_THRESHOLD_PX) previous();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    }
  };

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 22 };

  return (
    <div
      className={cn("w-full", className)}
      role="region"
      aria-roledescription="carrusel"
      aria-label={label}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative h-52">
        {testimonials.map((testimonial, index) => {
          const position = (index - currentIndex + count) % count;
          if (position > 2) return null;
          const isCurrent = position === 0;

          return (
            <motion.article
              key={testimonial.id}
              aria-hidden={!isCurrent}
              aria-roledescription="reseña"
              aria-label={`${currentIndex + 1} de ${count}`}
              className={cn(
                "absolute inset-0 flex flex-col gap-3 rounded-[1.75rem] border border-white/70 bg-white p-5 shadow-xl shadow-slate-900/10",
                "dark:border-accent-cyan/10 dark:bg-surface-elevated dark:shadow-surface-dark",
                isCurrent && count > 1 ? "cursor-grab touch-pan-y active:cursor-grabbing" : "pointer-events-none",
              )}
              style={{ zIndex: 3 - position }}
              drag={isCurrent && count > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={isCurrent ? handleDragEnd : undefined}
              initial={false}
              animate={{
                scale: 1 - position * 0.04,
                opacity: isCurrent ? 1 : position === 1 ? 0.7 : 0.4,
                x: isCurrent ? exitX : 0,
                y: position * 14,
                rotate: isCurrent ? exitX / 20 : position * -3,
              }}
              transition={transition}
            >
              <div className="flex items-center gap-3">
                {testimonial.avatar ? (
                  <Image
                    src={testimonial.avatar}
                    alt=""
                    width={44}
                    height={44}
                    draggable={false}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-teal/15 text-sm font-semibold text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan"
                    aria-hidden="true"
                  >
                    {initials(testimonial.name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {testimonial.href && isCurrent ? (
                    <a
                      href={testimonial.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-semibold text-slate-900 underline decoration-brand-teal/40 underline-offset-2 hover:text-brand-teal dark:text-white dark:hover:text-accent-cyan"
                    >
                      {testimonial.name}
                    </a>
                  ) : (
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{testimonial.name}</p>
                  )}
                  <div className="mt-0.5 flex items-center gap-2">
                    {typeof testimonial.rating === "number" ? (
                      <Stars rating={testimonial.rating} className="shrink-0" />
                    ) : null}
                    {testimonial.meta ? (
                      <p className="truncate text-xs text-slate-500 dark:text-slate-300">{testimonial.meta}</p>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="line-clamp-4 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
                &ldquo;{testimonial.text}&rdquo;
              </p>
            </motion.article>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={previous}
            aria-label="Reseña anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition hover:border-brand-teal/40 hover:text-brand-teal focus-visible:outline-2 focus-visible:outline-brand-sky dark:border-surface-muted dark:bg-surface-elevated dark:text-slate-300 dark:hover:text-accent-cyan"
          >
            <CaretLeft className="h-4 w-4" weight="bold" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1.5">
            {testimonials.map((testimonial, index) => (
              <button
                key={testimonial.id}
                type="button"
                aria-label={`Ver reseña ${index + 1} de ${count}`}
                aria-current={index === currentIndex ? "true" : undefined}
                onClick={() => goTo(() => index, index >= currentIndex ? 1 : -1)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "w-4 bg-brand-teal dark:bg-accent-cyan"
                    : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            aria-label="Reseña siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 transition hover:border-brand-teal/40 hover:text-brand-teal focus-visible:outline-2 focus-visible:outline-brand-sky dark:border-surface-muted dark:bg-surface-elevated dark:text-slate-300 dark:hover:text-accent-cyan"
          >
            <CaretRight className="h-4 w-4" weight="bold" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
