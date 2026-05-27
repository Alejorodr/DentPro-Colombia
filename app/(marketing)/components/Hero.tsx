import Image from "next/image";

import type { GoogleReviewsSummary } from "@/lib/google/google-reviews";

import { HeroGoogleReviewRotator } from "./HeroGoogleReviewRotator";

interface HeroStat {
  label: string;
  description: string;
}

interface HeroTestimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

interface HeroContent {
  badge: string;
  title: string;
  description: string;
  primaryCta: {
    href: string;
    label: string;
  };
  secondaryCta: {
    href: string;
    label: string;
  };
  stats: HeroStat[];
  image: {
    src: string;
    alt: string;
  };
  testimonial: HeroTestimonial;
  googleReviews?: GoogleReviewsSummary | null;
}

export function Hero({
  badge,
  title,
  description,
  primaryCta,
  secondaryCta,
  stats,
  image,
  testimonial,
  googleReviews,
}: HeroContent) {
  return (
    <section className="hero z-10 overflow-visible! bg-hero-light pt-12 pb-24 transition-colors duration-500 dark:bg-hero-dark sm:pt-12 sm:pb-24 md:pt-16 md:pb-28 lg:pt-20 lg:pb-32">
      <div className="container mx-auto grid items-center gap-12 px-6 md:gap-14 lg:grid-cols-2 lg:gap-16">
        <div className="relative z-10 space-y-8" data-hero-text-panel>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-brand-indigo shadow-xs dark:bg-surface-elevated/80 dark:text-accent-cyan">
            {badge}
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-slate-900 dark:text-white md:text-5xl">
            {title}
          </h1>
          <p className="max-w-xl text-lg text-slate-600 dark:text-slate-200">{description}</p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <a href={primaryCta.href} className="btn-primary">
              {primaryCta.label}
            </a>
            <a href={secondaryCta.href} className="btn-secondary">
              {secondaryCta.label}
            </a>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`space-y-0.5 text-sm ${i > 0 ? "sm:border-l sm:border-slate-200/70 sm:pl-4 dark:sm:border-surface-muted/50" : ""}`}
              >
                <dt className="font-bold text-slate-900 dark:text-white">{stat.label}</dt>
                <dd className="text-slate-500 dark:text-slate-300">{stat.description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative isolate mx-auto w-full max-w-[31rem] lg:max-h-[600px] lg:scale-95 xl:max-h-[640px] xl:scale-[0.98]">
          <div className="relative z-10">
            <div className="card relative z-10 border-white/40 bg-white/80 p-6 shadow-xl shadow-brand-teal/20 backdrop-blur-sm transition-colors duration-500 hover:translate-y-0! hover:shadow-xl! dark:border-accent-cyan/10! dark:bg-surface-elevated/70! dark:shadow-surface-dark lg:p-8">
              <div className="relative aspect-4/5 max-h-[32rem] overflow-hidden rounded-2xl bg-linear-to-br from-brand-teal via-brand-sky to-brand-indigo dark:from-accent-cyan dark:via-brand-teal dark:to-brand-midnight">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority
                  sizes="(min-width: 1280px) 25rem, (min-width: 1024px) 23rem, 88vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="card relative z-20 mt-6 grid gap-4 rounded-2xl bg-white/90 p-6 text-sm shadow-lg! transition-colors duration-500 hover:translate-y-0! hover:shadow-lg! dark:bg-surface-muted/90! dark:text-slate-100">
                <HeroGoogleReviewRotator googleReviews={googleReviews} fallback={testimonial} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
