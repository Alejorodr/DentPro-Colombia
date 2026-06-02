"use client";

import Image from "next/image";

import { CaretLeft, CaretRight } from "@/components/ui/Icon";

import { useSpecialistsCarousel } from "@/hooks/useSpecialistsCarousel";

interface SpecialistCard {
  name: string;
  specialty: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
}

interface SpecialistsSliderProps {
  badge: string;
  title: string;
  description: string;
  specialists: SpecialistCard[];
}

export function SpecialistsSlider({ badge, title, description, specialists }: SpecialistsSliderProps) {
  const { containerRef, trackRef, currentIndex, maxIndex, goNext, goPrev, goTo, translateX } = useSpecialistsCarousel(
    specialists.length,
  );

  return (
    <section id="especialistas" className="bg-brand-light py-20 transition-colors duration-300 dark:bg-surface-muted">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="badge">{badge}</span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-700 dark:text-slate-200">{description}</p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              className="slider-btn"
              aria-label="Ver anterior especialista"
              onClick={goPrev}
              disabled={currentIndex === 0}
            >
              <CaretLeft className="h-5 w-5" weight="bold" aria-hidden="true" />
            </button>
            <button
              className="slider-btn"
              aria-label="Ver siguiente especialista"
              onClick={goNext}
              disabled={currentIndex >= maxIndex}
            >
              <CaretRight className="h-5 w-5" weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Slider */}
        <div className="slider mt-10" data-slider ref={containerRef}>
          <div
            className="slider-track"
            ref={trackRef}
            style={{ transform: `translateX(${translateX}px)` }}
          >
            {specialists.map((specialist) => (
              <article key={specialist.name} className="specialist flex flex-col" data-slide>
                <Image
                  src={specialist.image.src}
                  alt={specialist.image.alt}
                  width={600}
                  height={750}
                  className="specialist-photo"
                  sizes="(min-width: 1280px) calc((100vw - 3rem) / 3), (min-width: 768px) calc((100vw - 2rem) / 2), 90vw"
                />
                <div className="mt-4 flex flex-1 flex-col">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{specialist.name}</h3>
                  <span className="mt-1.5 inline-block w-fit rounded-full bg-brand-teal/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan">
                    {specialist.specialty}
                  </span>
                  <p className="mt-3 flex-1 text-sm text-slate-600 dark:text-slate-200">{specialist.description}</p>
                  <div className="mt-5 border-t border-slate-100/70 pt-4 dark:border-surface-muted/50">
                    <a href="/appointments/new" className="btn-secondary w-full justify-center text-sm">
                      Reservar cita
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        {specialists.length > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Navegación de especialistas">
            {specialists.map((s, i) => (
              <button
                key={s.name}
                role="tab"
                aria-selected={i === currentIndex}
                aria-label={`Ver ${s.name}`}
                onClick={() => goTo(Math.min(i, maxIndex))}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:focus-visible:ring-accent-cyan/60 ${
                  i === currentIndex
                    ? "w-6 bg-brand-teal dark:bg-accent-cyan"
                    : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

