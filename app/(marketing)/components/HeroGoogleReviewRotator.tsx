"use client";

import { Stars, TestimonialCarousel, type Testimonial } from "@/components/ui/TestimonialCarousel";
import type { GoogleReviewsSummary } from "@/lib/google/google-reviews";

type FallbackTestimonial = {
  quote: string;
  author: string;
  role: string;
  avatar: string;
};

type HeroGoogleReviewRotatorProps = {
  googleReviews?: GoogleReviewsSummary | null;
  fallback: FallbackTestimonial;
};

/**
 * Reseñas del hero (DOG-35): pila de tarjetas que se descartan arrastrando, superpuesta al pie
 * de la foto. Usa las reseñas de Google; si Google no responde, muestra el testimonio por defecto.
 */
export function HeroGoogleReviewRotator({ googleReviews, fallback }: HeroGoogleReviewRotatorProps) {
  const reviews = googleReviews?.reviews ?? [];

  const testimonials: Testimonial[] =
    reviews.length > 0
      ? reviews.map((review) => ({
          id: review.id,
          name: review.authorName,
          text: review.text,
          avatar: review.authorPhotoUri,
          rating: review.rating,
          meta: review.relativeTime,
          href: review.authorUri,
        }))
      : [{ id: "fallback", name: fallback.author, text: fallback.quote, meta: fallback.role }];

  const globalRating = typeof googleReviews?.rating === "number" ? googleReviews.rating : null;

  return (
    // DOG-66: grid-cols-1 + min-w-0, igual que en DOG-62. Sin columnas explícitas, la barra de
    // calificación (nowrap) estiraba la columna y la tarjeta se salía de la pantalla a 320 px.
    <div className="grid min-w-0 grid-cols-1 gap-3">
      <TestimonialCarousel testimonials={testimonials} />

      {googleReviews && reviews.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border min-[360px]:rounded-full border-white/70 bg-white/90 px-4 py-2 text-sm shadow-lg shadow-slate-900/10 backdrop-blur-sm dark:border-accent-cyan/10 dark:bg-surface-elevated/90">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {globalRating !== null ? (
              <span className="font-bold text-slate-900 dark:text-white">{globalRating.toFixed(1)}</span>
            ) : null}
            <Stars rating={globalRating ?? 5} />
            {typeof googleReviews.userRatingCount === "number" ? (
              <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                {googleReviews.userRatingCount.toLocaleString("es-CO")} reseñas
              </span>
            ) : null}
          </div>
          {googleReviews.googleMapsUri ? (
            <a
              href={googleReviews.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap text-[11px] font-semibold text-brand-teal underline decoration-brand-teal/40 underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
            >
              Google Maps
            </a>
          ) : (
            <span className="text-[11px] text-slate-400">Google Maps</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
