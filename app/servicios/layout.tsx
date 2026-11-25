import { Navbar } from "@/app/(marketing)/components/Navbar";
import { InfoBar } from "@/app/(marketing)/components/InfoBar";
import { FloatingActions } from "@/app/(marketing)/components/FloatingActions";
import { getHomepageContent } from "@/lib/marketing/homepage";
import { HOMEPAGE_DEFAULT_CONTENT } from "@/lib/marketing/homepage-defaults";
import { adaptHomepageContent } from "@/lib/marketing/homepage-adapter";
import { getGoogleReviews } from "@/lib/google/google-reviews";
import { DogbyteCreditFooter } from "@/components/ui/DogbyteCredit";

export const revalidate = 3600;

const navbarLinks = [
  { href: "/", label: "Inicio" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/#especialistas", label: "Especialistas" },
  { href: "/#agenda", label: "Agenda" },
  { href: "/#contacto", label: "Contacto" },
];

export default async function ServiciosLayout({ children }: { children: React.ReactNode }) {
  const [homepageContent, googleReviews] = await Promise.all([
    // Igual que el home: si la base no responde, se usa el contenido por defecto en vez de un error.
    getHomepageContent().catch(() => HOMEPAGE_DEFAULT_CONTENT),
    getGoogleReviews(),
  ]);

  const marketingContent = adaptHomepageContent(homepageContent);

  return (
    <>
      <InfoBar
        {...marketingContent.infoBar}
        googleRating={
          googleReviews?.rating && googleReviews.userRatingCount
            ? { rating: googleReviews.rating, count: googleReviews.userRatingCount, url: googleReviews.googleMapsUri }
            : undefined
        }
      />
      <Navbar
        brand={{ href: "/", name: "DentPro Colombia", initials: "DP" }}
        links={navbarLinks}
        cta={{ href: "/appointments/new", label: "Reservar turno" }}
        login={{ href: "/auth/login", label: "Iniciar sesión" }}
      />
      <main>{children}</main>
      <DogbyteCreditFooter />
      <FloatingActions {...marketingContent.floatingActions} />
    </>
  );
}
