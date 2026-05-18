"use client";

import { useEffect, useRef, useState } from "react";

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
const FADE_DURATION_MS = 250;

export function HeroGoogleReviewRotator({
  googleReviews,
  fallback,
}: HeroGoogleReviewRotatorProps) {
  const reviews = googleReviews?.reviews ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reviews.length < 2) return;

    const interval = window.setInterval(() => {
      setVisible(false);
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % reviews.length);
        setVisible(true);
      }, FADE_DURATION_MS);
    }, ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reviews.length]);

  if (!googleReviews || reviews.length === 0) {
    return (
      <>
        <p className="font-semibold text-brand-teal dark:text-accent-cyan">Testimonio real</p>
        <p className="min-h-[5.5rem] text-slate-600 dark:text-slate-200">"{fallback.quote}"</p>
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
      {/* Global rating — shown prominently at the top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {globalRating ? (
            <span className="text-lg font-bold text-slate-900 dark:text-white">{globalRating}</span>
          ) : null}
          <span className="text-amber-400 text-base leading-none" aria-hidden="true">★★★★★</span>
          {typeof googleReviews.userRatingCount === "number" ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {googleReviews.userRatingCount.toLocaleString("es-CO")} reseñas
            </span>
          ) : null}
        </div>
        {googleReviews.googleMapsUri ? (
          <a
            href={googleReviews.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-brand-teal underline decoration-brand-teal/40 underline-offset-2 hover:text-brand-indigo dark:text-accent-cyan"
          >
            Google Maps
          </a>
        ) : (
          <span className="text-[11px] text-slate-400">Google Maps</span>
        )}
      </div>

      {/* Review text with fade transition */}
      <div
        className="min-h-[5.5rem] transition-opacity"
        style={{
          opacity: visible ? 1 : 0,
          transitionDuration: `${FADE_DURATION_MS}ms`,
        }}
      >
        <div
          className="mb-1 text-amber-400"
          aria-label={`Calificación: ${review.rating} de 5 estrellas`}
        >
          {"★".repeat(reviewStars)}
          <span className="text-slate-300 dark:text-slate-600">{"★".repeat(5 - reviewStars)}</span>
        </div>
        <p className="text-slate-600 dark:text-slate-200">"{review.text}"</p>
      </div>

      {/* Author */}
      <div
        className="flex items-center gap-4 transition-opacity"
        style={{
          opacity: visible ? 1 : 0,
          transitionDuration: `${FADE_DURATION_MS}ms`,
        }}
      >
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

      {/* Dot indicators */}
      {reviews.length > 1 ? (
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Reseñas">
          {reviews.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`Reseña ${i + 1} de ${reviews.length}`}
              onClick={() => {
                setVisible(false);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                  setCurrentIndex(i);
                  setVisible(true);
                }, FADE_DURATION_MS);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-4 bg-brand-teal dark:bg-accent-cyan"
                  : "w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
