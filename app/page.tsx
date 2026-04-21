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
    href: "#agenda",
    label: "Agenda tu cita",
  },
  login: {
    href: "/auth/login",
    label: "Iniciar sesión",
  },
};

export default async function Home() {
  const homepageContent = await getHomepageContent();
  const marketingContent = adaptHomepageContent(homepageContent);

  return (
    <>
      <InfoBar {...marketingContent.infoBar} />
      <Navbar {...navbarContent} />
      <main id="inicio">
        <Hero {...marketingContent.hero} />
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
