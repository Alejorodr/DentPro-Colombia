export const revalidate = 300;

import type { Metadata } from "next";
import { InfoBar } from "./(marketing)/components/InfoBar";
import { Navbar } from "./(marketing)/components/Navbar";
import { Hero } from "./(marketing)/components/Hero";
import { CampaignCarousel } from "./(marketing)/components/CampaignCarousel";
import { ServicesSection } from "./(marketing)/components/Services";
import { SpecialistsSlider } from "./(marketing)/components/SpecialistsSlider";
import { BookingFormSection } from "./(marketing)/components/BookingForm";
import { ContactSection } from "./(marketing)/components/ContactSection";
import { FloatingActions } from "./(marketing)/components/FloatingActions";
import { FAQSection } from "./(marketing)/components/FAQSection";
import { getHomepageContent } from "@/lib/marketing/homepage";
import { adaptHomepageContent } from "@/lib/marketing/homepage-adapter";
import { getGoogleReviews } from "@/lib/google/google-reviews";
import { HOMEPAGE_DEFAULT_CONTENT } from "@/lib/marketing/homepage-defaults";

const DEFAULT_META_TITLE = "Odontología especializada en Chía | Agenda online";
const DEFAULT_META_DESCRIPTION =
  "DentPro Colombia — ortodoncia, implantes, estética dental, endodoncia y odontopediatría en Chía, Cundinamarca. Reserva tu turno en línea con confirmación inmediata.";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getHomepageContent().catch(() => HOMEPAGE_DEFAULT_CONTENT);
  return {
    title: content.seo.metaTitle ?? DEFAULT_META_TITLE,
    description: content.seo.metaDescription ?? DEFAULT_META_DESCRIPTION,
    alternates: { canonical: "/" },
  };
}

// Prevents </script> injection in JSON-LD script blocks
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const NAV_LINKS = [
  { href: "#servicios", label: "Servicios" },
  { href: "#especialistas", label: "Especialistas" },
  { href: "#agenda", label: "Agenda" },
  { href: "#preguntas-frecuentes", label: "FAQ" },
  { href: "#contacto", label: "Contacto" },
];

const NAV_CTA = { href: "/appointments/new", label: "Reservar turno" };
const NAV_LOGIN = { href: "/auth/login", label: "Iniciar sesión" };

export default async function Home() {
  const [homepageContent, googleReviews] = await Promise.all([
    getHomepageContent().catch(() => HOMEPAGE_DEFAULT_CONTENT),
    getGoogleReviews(),
  ]);

  const marketingContent = adaptHomepageContent(homepageContent);
  const faqItems = homepageContent.faqs;

  const navbarContent: Parameters<typeof Navbar>[0] = {
    brand: {
      href: "#inicio",
      name: marketingContent.brand.name,
      initials: marketingContent.brand.initials,
      logoUrl: marketingContent.brand.logoUrl ?? undefined,
    },
    links: NAV_LINKS,
    cta: NAV_CTA,
    login: NAV_LOGIN,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: homepageContent.brand.name,
    url: "https://dentprocolombia.com",
    telephone: homepageContent.contact.channels[0]?.value ?? "+573237968435",
    email: homepageContent.contact.channels[2]?.value ?? "dentprocolombia@gmail.com",
    description:
      homepageContent.seo.metaDescription ??
      "Clínica odontológica en Chía, Cundinamarca. Ortodoncia, implantes, estética dental, endodoncia y odontopediatría.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Cra. 7 #13-180",
      addressLocality: "Chía",
      addressRegion: "Cundinamarca",
      addressCountry: "CO",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 4.862466,
      longitude: -74.06082,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "08:00",
        closes: "19:00",
      },
    ],
    sameAs: [
      "https://www.instagram.com/dentprocol",
      "https://www.facebook.com/dentprocol",
      "https://www.tiktok.com/@dentprocol",
    ],
    priceRange: "$$",
    ...(googleReviews?.rating && googleReviews.userRatingCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: googleReviews.rating.toFixed(1),
            reviewCount: googleReviews.userRatingCount,
          },
        }
      : {}),
  };

  const faqJsonLd =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}
      <InfoBar
        {...marketingContent.infoBar}
        googleRating={
          googleReviews?.rating && googleReviews.userRatingCount
            ? {
                rating: googleReviews.rating,
                count: googleReviews.userRatingCount,
                url: googleReviews.googleMapsUri,
              }
            : undefined
        }
      />
      <Navbar {...navbarContent} />

      <main id="inicio" aria-label="Página principal DentPro Colombia">
        <Hero {...marketingContent.hero} googleReviews={googleReviews} />
        <CampaignCarousel />
        <ServicesSection {...marketingContent.services} />
        <SpecialistsSlider {...marketingContent.specialists} />
        <BookingFormSection {...marketingContent.booking} />
        {faqItems.length > 0 && <FAQSection items={faqItems} />}
        <ContactSection {...marketingContent.contact} />
      </main>
      <FloatingActions {...marketingContent.floatingActions} />
    </>
  );
}
