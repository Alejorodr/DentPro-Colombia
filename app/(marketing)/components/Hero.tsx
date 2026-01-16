import Image from "next/image";

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

interface HeroHighlight {
  title: string;
  description?: string;
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
  highlight: HeroHighlight;
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
  highlight,
}: HeroContent) {
  return (
    <section className="hero overflow-hidden bg-hero-light py-12 transition-colors duration-500 dark:bg-hero-dark sm:py-12 md:py-16 lg:py-20">
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
          <dl className="grid gap-6 text-sm text-slate-600 dark:text-slate-200 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="font-semibold text-slate-900 dark:text-white">{stat.label}</dt>
                <dd>{stat.description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative isolate lg:max-h-[640px] lg:scale-[0.98] xl:max-h-[680px] xl:scale-100">
          <div className="relative z-10">
            <div className="card border-white/40 bg-white/80 p-6 shadow-xl shadow-brand-teal/20 backdrop-blur-sm transition-colors duration-500 hover:translate-y-0! hover:shadow-xl! dark:border-accent-cyan/10! dark:bg-surface-elevated/70! dark:shadow-surface-dark lg:p-8">
              <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-linear-to-br from-brand-teal via-brand-sky to-brand-indigo dark:from-accent-cyan dark:via-brand-teal dark:to-brand-midnight">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority
                  sizes="(min-width: 1280px) 28rem, (min-width: 1024px) 26rem, 90vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="card mt-6 grid gap-4 rounded-2xl bg-white/90 p-6 text-sm shadow-lg! transition-colors duration-500 hover:translate-y-0! hover:shadow-lg! dark:bg-surface-muted/90! dark:text-slate-100">
                <p className="font-semibold text-brand-teal dark:text-accent-cyan">Testimonio real</p>
                <p className="text-slate-600 dark:text-slate-200">“{testimonial.quote}”</p>
                <div className="flex items-center gap-4">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.author}
                      fill
                      sizes="48px"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{testimonial.author}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card mx-auto mt-6 w-full max-w-xs space-y-2 border-white/60 p-5 text-center text-sm text-slate-700 shadow-glow! backdrop-blur-sm transition-colors duration-500 hover:translate-y-0! hover:shadow-glow! dark:border-accent-cyan/15! dark:bg-surface-elevated/90! dark:text-slate-100 dark:shadow-glow-dark sm:absolute sm:-bottom-12 sm:right-6 sm:mx-0 sm:mt-0 sm:text-left sm:shadow-lg sm:p-6">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-accent-cyan/80">Indicadores clínicos</p>
              <p className="text-2xl font-bold text-brand-indigo dark:text-accent-cyan">{highlight.title}</p>
              {highlight.description ? <p>{highlight.description}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

