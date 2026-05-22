export const revalidate = 300;

import { InfoBar } from "./(marketing)/components/InfoBar";
import { Navbar } from "./(marketing)/components/Navbar";
import { Hero } from "./(marketing)/components/Hero";
import { CampaignCarousel } from "./(marketing)/components/CampaignCarousel";
import { ServicesSection } from "./(marketing)/components/Services";
import { SpecialistsSlider } from "./(marketing)/components/SpecialistsSlider";
import { BookingFormSection } from "./(marketing)/components/BookingForm";
import { ContactSection } from "./(marketing)/components/ContactSection";
import { FloatingActions } from "./(marketing)/components/FloatingActions";
import { getHomepageContent } from "@/lib/marketing/homepage";
import { adaptHomepageContent } from "@/lib/marketing/homepage-adapter";
import { getGoogleReviews } from "@/lib/google/google-reviews";

const navbarContent: Parameters<typeof Navbar>[0] = {
  brand: {
    href: "#inicio",
    name: "DentPro Colombia",
    initials: "DP",
  },
  links: [
    { href: "#servicios", label: "Servicios" },
    { href: "#especialistas", label: "Especialistas" },
    { href: "#agenda", label: "Agenda" },
    { href: "#contacto", label: "Contacto" },
  ],
  cta: {
    href: "/appointments/new",
    label: "Reservar turno",
  },
  login: {
    href: "/auth/login",
    label: "Iniciar sesión",
  },
};

export default async function Home() {
  const [homepageContent, googleReviews] = await Promise.all([
    getHomepageContent(),
    getGoogleReviews(),
  ]);

  const marketingContent = adaptHomepageContent(homepageContent);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: "DentPro Colombia",
    url: "https://dentprocolombia.com",
    telephone: "+573237968435",
    email: "dentprocolombia@gmail.com",
    description:
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <InfoBar {...marketingContent.infoBar} />
      <Navbar {...navbarContent} />
      <main id="inicio" aria-label="Página principal DentPro Colombia">
        <Hero {...marketingContent.hero} googleReviews={googleReviews} />
        <CampaignCarousel />
        <ServicesSection {...marketingContent.services} />
        <SpecialistsSlider {...marketingContent.specialists} />
        <BookingFormSection {...marketingContent.booking} />
        <ContactSection {...marketingContent.contact} />
      </main>
      <FloatingActions {...marketingContent.floatingActions} />
    </>
  );
}
