import type { HomepageNormalizedContent, MarketingIconKey } from "@/lib/marketing/homepage-types";

type FloatingAction = {
  href: string;
  label: string;
  icon: MarketingIconKey;
  className?: string;
  external?: boolean;
};

export type HomepageViewModel = {
  infoBar: HomepageNormalizedContent["infoBar"];
  hero: HomepageNormalizedContent["hero"];
  services: HomepageNormalizedContent["services"];
  specialists: HomepageNormalizedContent["specialists"];
  booking: HomepageNormalizedContent["booking"];
  contact: Omit<HomepageNormalizedContent["contact"], "mapEmbedUrl"> & {
    mapEmbedUrl?: string;
  };
  floatingActions: {
    actions: FloatingAction[];
  };
};

function normalizePhoneHref(phoneNumber: string): string {
  if (phoneNumber.startsWith("tel:")) {
    return phoneNumber;
  }

  return `tel:${phoneNumber}`;
}

function normalizeWhatsappHref(phoneNumber: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}`;
}

function isSafeMapEmbedUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") {
      return false;
    }

    const allowedHosts = new Set(["www.google.com", "google.com", "maps.google.com"]);
    return allowedHosts.has(url.hostname);
  } catch {
    return false;
  }
}

export function adaptHomepageContent(content: HomepageNormalizedContent): HomepageViewModel {
  const mapEmbedUrl = isSafeMapEmbedUrl(content.contact.mapEmbedUrl)
    ? content.contact.mapEmbedUrl
    : undefined;

  return {
    infoBar: content.infoBar,
    hero: content.hero,
    services: content.services,
    specialists: content.specialists,
    booking: content.booking,
    contact: {
      ...content.contact,
      mapEmbedUrl,
    },
    floatingActions: {
      actions: [
        {
          href: normalizeWhatsappHref(content.floatingActions.whatsappNumber),
          label: "Chat en WhatsApp",
          icon: "WhatsappLogo",
          className: "whatsapp",
          external: true,
        },
        {
          href: normalizePhoneHref(content.floatingActions.phoneNumber),
          label: "Llamar a DentPro",
          icon: "Phone",
          className: "phone",
        },
        {
          href: "#agenda",
          label: "Ir a agenda",
          icon: "CalendarCheck",
        },
      ],
    },
  };
}
