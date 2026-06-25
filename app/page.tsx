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

export const metadata: Metadata = {
  title: "Odontología especializada en Chía | Agenda online",
  description:
    "DentPro Colombia — ortodoncia, implantes, estética dental, endodoncia y odontopediatría en Chía, Cundinamarca. Reserva tu turno en línea con confirmación inmediata.",
  alternates: { canonical: "/" },
};

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
    { href: "#preguntas-frecuentes", label: "FAQ" },
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

  const faqItems = [
    {
      question: "¿Cómo agendo una cita en DentPro?",
      answer:
        "Podés reservar tu turno directamente en línea desde el botón "Reservar turno" de esta página — el sistema confirma disponibilidad en tiempo real y te envía un correo de confirmación. También podés escribirnos por WhatsApp al 323 796 8435 o llamarnos al mismo número.",
    },
    {
      question: "¿Cuánto cuesta la primera consulta?",
      answer:
        "La valoración inicial incluye revisión clínica completa, diagnóstico y plan de tratamiento personalizado. Consultá el valor actualizado escribiéndonos por WhatsApp — los precios varían según el especialista y el tratamiento requerido.",
    },
    {
      question: "¿Atienden urgencias dentales?",
      answer:
        "Sí. Reservamos cupos de urgencia todos los días de la semana. Si tenés dolor intenso, fractura o pérdida de una pieza, escribinos por WhatsApp y te damos turno el mismo día o al siguiente.",
    },
    {
      question: "¿Tienen convenios con seguros o EPS?",
      answer:
        "Trabajamos principalmente como clínica particular. Para convenios empresariales o con aseguradoras, contactanos directamente a dentprocolombia@gmail.com y evaluamos opciones según tu caso.",
    },
    {
      question: "¿Qué debo llevar a mi primera cita?",
      answer:
        "Documento de identidad, radiografías recientes (si tenés), y cualquier tratamiento o medicación que estés tomando actualmente. Si sos menor de edad, un acudiente debe acompañarte.",
    },
    {
      question: "¿Ofrecen planes de pago o financiación?",
      answer:
        "Sí, manejamos planes de pago para tratamientos de mayor valor como ortodoncia, implantes y rehabilitación. Conversalo con nuestro equipo al momento de la valoración inicial.",
    },
  ];

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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
        <FAQSection items={faqItems} />
        <ContactSection {...marketingContent.contact} />
      </main>
      <FloatingActions {...marketingContent.floatingActions} />
    </>
  );
}
