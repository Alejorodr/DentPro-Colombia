"use client";

import Image from "next/image";

import { useSpecialistsCarousel } from "@/hooks/useSpecialistsCarousel";

type Specialist = {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
};

const specialists: Specialist[] = [
  {
    id: "u2",
    name: "Dr. Santiago Herrera",
    specialty: "Rehabilitación oral",
    avatar: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "u5",
    name: "Dra. Natalia Rincón",
    specialty: "Ortodoncia invisible",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "u6",
    name: "Dra. Camila Torres",
    specialty: "Odontopediatría",
    avatar: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=200&q=80",
  },
];

export function SpecialistsShowcase() {
  const { containerRef, trackRef, currentIndex, maxIndex, goNext, goPrev, translateX } = useSpecialistsCarousel(
    specialists.length,
  );

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-surface-elevated">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Equipo destacado</h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Accede rápidamente a los perfiles más consultados por los pacientes.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="slider-btn" onClick={goPrev} aria-label="Ver anterior" disabled={currentIndex === 0}>
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <button className="slider-btn" onClick={goNext} aria-label="Ver siguiente" disabled={currentIndex >= maxIndex}>
            <span className="material-symbols-rounded">arrow_forward</span>
          </button>
        </div>
      </div>
      <div className="slider" ref={containerRef}>
        <div className="slider-track" ref={trackRef} style={{ transform: `translateX(${translateX}px)` }}>
          {specialists.map((specialist) => (
            <article key={specialist.id} className="card specialist" data-slide>
              <Image
                src={specialist.avatar}
                alt={specialist.name}
                width={160}
                height={160}
                className="h-32 w-32 rounded-full object-cover"
              />
              <div className="mt-4">
                <h4 className="text-base font-semibold">{specialist.name}</h4>
                <p className="text-sm text-brand-teal dark:text-accent-cyan">{specialist.specialty}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
