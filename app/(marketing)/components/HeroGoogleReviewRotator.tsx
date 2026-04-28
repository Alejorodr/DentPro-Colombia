"use client";

import { useEffect, useState } from "react";

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

const ROTATION_INTERVAL_MS = 10_000;

export function HeroGoogleReviewRotator({
  googleReviews,
  fallback,
}: HeroGoogleReviewRotatorProps) {
  const reviews = googleReviews?.reviews ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (reviews.length < 2) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [reviews.length]);

  if (!googleReviews || reviews.length === 0) {
    return (
      <>
        <p className="font-semibold text-brand-teal dark:text-accent-cyan">Testimonio real</p>
        <p className="min-h-[5.5rem] text-slate-600 dark:text-slate-200">“{fallback.quote}”</p>
        <div className="flex items-center gap-4">
          <img
            src={fallback.avatar}
            alt={fallback.author}
            className="h-12 w-12 rounded-full object-cover"
            loading="lazy"
          />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{fallback.author}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{fallback.role}</p>
          </div>
        </div>
      </>
    );
  }

  const review = reviews[currentIndex] ?? reviews[0];
  const reviewStars = Math.max(0, Math.min(5, Math.round(review.rating)));
  const globalRating = typeof googleReviews.rating === "number" ? googleReviews.rating.toFixed(1) : null;

  return (
    <>
      <p className="font-semibold text-brand-teal dark:text-accent-cyan">Opinión destacada en Google</p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Google Maps</p>
      <div
        className="text-amber-400"
        aria-label={`Calificación de la reseña: ${review.rating} de 5 estrellas`}
      >
        {"★".repeat(reviewStars)}
        <span className="text-slate-300">{"★".repeat(5 - reviewStars)}</span>
      </div>
      <p className="min-h-[5.5rem] text-slate-600 dark:text-slate-200">“{review.text}”</p>
      <div className="flex items-center gap-4">
        {review.authorPhotoUri ? (
          <img
            src={review.authorPhotoUri}
            alt={review.authorName}
            className="h-12 w-12 rounded-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-teal/15 text-sm font-semibold text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan">
            {review.authorName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          {review.authorUri ? (
            <a
              href={review.authorUri}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-900 underline decoration-brand-teal/50 underline-offset-2 hover:text-brand-teal dark:text-white dark:hover:text-accent-cyan"
            >
              {review.authorName}
            </a>
          ) : (
            <p className="font-semibold text-slate-900 dark:text-white">{review.authorName}</p>
          )}
          {review.relativeTime ? (
            <p className="text-xs text-slate-500 dark:text-slate-300">{review.relativeTime}</p>
          ) : null}
        </div>
      </div>
      {(globalRating || googleReviews.userRatingCount) && (
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Google Maps
          {globalRating ? ` · ${globalRating}/5` : ""}
          {typeof googleReviews.userRatingCount === "number"
            ? ` · ${googleReviews.userRatingCount} valoraciones`
            : ""}
        </p>
      )}
      {googleReviews.googleMapsUri ? (
        <a
          href={googleReviews.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-brand-teal underline decoration-brand-teal/50 underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
        >
          Ver perfil en Google Maps
        </a>
      ) : null}
    </>
  );
}
