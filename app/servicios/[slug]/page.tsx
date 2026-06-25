import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SERVICES, getServiceBySlug } from "@/lib/marketing/services-data";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) return {};

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentprocolombia.com";

  return {
    title: `${service.name} en Chía`,
    description: service.description,
    keywords: service.keywords,
    alternates: { canonical: `/servicios/${service.slug}` },
    openGraph: {
      title: `${service.name} en Chía, Cundinamarca | DentPro Colombia`,
      description: service.description,
      url: `${siteUrl}/servicios/${service.slug}`,
      images: [{ url: service.image.src, width: 1200, alt: service.image.alt }],
    },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentprocolombia.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: service.name,
    description: service.description,
    url: `${siteUrl}/servicios/${service.slug}`,
    provider: {
      "@type": "Dentist",
      name: "DentPro Colombia",
      url: siteUrl,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Cra. 7 #13-180",
        addressLocality: "Chía",
        addressRegion: "Cundinamarca",
        addressCountry: "CO",
      },
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="border-b border-slate-100 bg-white dark:border-surface-muted/40 dark:bg-surface-base">
        <div className="container mx-auto px-6 py-3 text-xs text-slate-500 dark:text-slate-400">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-brand-teal dark:hover:text-accent-cyan">Inicio</Link></li>
            <li aria-hidden="true">·</li>
            <li><Link href="/#servicios" className="hover:text-brand-teal dark:hover:text-accent-cyan">Servicios</Link></li>
            <li aria-hidden="true">·</li>
            <li className="font-semibold text-slate-700 dark:text-slate-200">{service.name}</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-hero-light py-16 transition-colors duration-500 dark:bg-hero-dark">
        <div className="container mx-auto grid items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-brand-indigo shadow-xs dark:bg-surface-elevated/80 dark:text-accent-cyan">
              {service.tagline}
            </span>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 dark:text-white md:text-5xl">
              {service.name}
            </h1>
            <p className="max-w-xl text-lg text-slate-600 dark:text-slate-200">{service.description}</p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/appointments/new" className="btn-primary">
                {service.ctaLabel}
              </Link>
              <Link href="/#contacto" className="btn-secondary">
                Más información
              </Link>
            </div>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-3xl shadow-xl">
            <Image
              src={service.image.src}
              alt={service.image.alt}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 transition-colors duration-300 dark:bg-surface-base">
        <div className="container mx-auto px-6">
          <h2 className="mb-10 text-2xl font-bold text-slate-900 dark:text-white">
            ¿Qué incluye el tratamiento?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {service.highlights.map((h) => (
              <div
                key={h.title}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-colors duration-300 dark:border-accent-cyan/10 dark:bg-surface-elevated"
              >
                <div className="mb-3 h-2 w-8 rounded-full bg-brand-teal dark:bg-accent-cyan" />
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{h.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{h.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 transition-colors duration-300 dark:bg-surface-base">
        <div className="container mx-auto max-w-3xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
            Preguntas frecuentes sobre {service.name.toLowerCase()}
          </h2>
          <dl className="space-y-4">
            {service.faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-accent-cyan/10 dark:bg-surface-elevated"
              >
                <dt className="font-semibold text-slate-900 dark:text-white">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient py-16 text-white transition-colors duration-500 dark:bg-card-dark">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold">¿Listo para empezar?</h2>
          <p className="mt-3 text-brand-light">
            Reservá tu turno en línea — confirmación inmediata, sin llamadas.
          </p>
          <Link
            href="/appointments/new"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-bold text-brand-teal shadow-md transition hover:bg-brand-light dark:bg-accent-cyan dark:text-slate-900"
          >
            {service.ctaLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
