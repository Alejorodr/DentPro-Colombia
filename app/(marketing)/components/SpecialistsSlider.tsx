"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [metrics, setMetrics] = useState({ width: 0, gap: 0, visible: 1 });

  useEffect(() => {
    const updateMetrics = () => {
      if (!trackRef.current || !containerRef.current) return;
      const firstSlide = trackRef.current.querySelector<HTMLElement>("[data-slide]");
      if (!firstSlide) return;

      const style = window.getComputedStyle(trackRef.current);
      const gapValue = parseFloat(style.columnGap || style.gap || "0");
      const slideRect = firstSlide.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const slideWidth = slideRect.width;
      const visible = Math.max(1, Math.round((containerRect.width + gapValue) / (slideWidth + gapValue)));

      setMetrics({ width: slideWidth, gap: gapValue, visible });
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, [specialists.length]);

  const maxIndex = useMemo(() => {
    return Math.max(0, specialists.length - metrics.visible);
  }, [metrics.visible, specialists.length]);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const goPrev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const goNext = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));

  const translateX = metrics.width ? -(currentIndex * (metrics.width + metrics.gap)) : 0;

  return (
    <section id="especialistas" className="bg-brand-light py-20 transition-colors duration-300 dark:bg-surface-muted">
      <div className="container px-6">
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
                <img src={specialist.image.src} alt={specialist.image.alt} className="specialist-photo" />
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
