"use client";

import Image from "next/image";

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
  const { containerRef, trackRef, currentIndex, maxIndex, goNext, goPrev, translateX } = useSpecialistsCarousel(
    specialists.length,
  );

  return (
    <section id="especialistas" className="bg-brand-light py-20 transition-colors duration-300 dark:bg-surface-muted">
      <div className="container mx-auto px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="badge">{badge}</span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-700 dark:text-slate-200">{description}</p>
          </div>
          <div className="flex gap-4">
            <button className="slider-btn" id="prevSpecialist" aria-label="Ver anterior" onClick={goPrev} disabled={currentIndex === 0}>
              <span className="material-symbols-rounded" aria-hidden="true">
                arrow_back
              </span>
            </button>
            <button
              className="slider-btn"
              id="nextSpecialist"
              aria-label="Ver siguiente"
              onClick={goNext}
              disabled={currentIndex >= maxIndex}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
        <div className="slider" data-slider ref={containerRef}>
          <div
            className="slider-track"
            id="specialistsTrack"
            ref={trackRef}
            style={{ transform: `translateX(${translateX}px)` }}
          >
            {specialists.map((specialist) => (
              <article key={specialist.name} className="card specialist" data-slide>
                <Image
                  src={specialist.image.src}
                  alt={specialist.image.alt}
                  width={600}
                  height={750}
                  className="specialist-photo"
                  sizes="(min-width: 1280px) calc((100vw - 3rem) / 3), (min-width: 768px) calc((100vw - 2rem) / 2), 90vw"
                />
                <div className="mt-4">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{specialist.name}</h3>
                  <p className="text-sm text-brand-teal dark:text-accent-cyan">{specialist.specialty}</p>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-200">{specialist.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

