import type {
  HomepageChannelContent,
  HomepageNormalizedContent,
  HomepageSocialLinkContent,
} from "@/lib/marketing/homepage-types";

export type HomepageViewModel = {
  brand: HomepageNormalizedContent["brand"];
  infoBar: {
    location: HomepageNormalizedContent["infoBar"]["location"];
    schedule: HomepageNormalizedContent["infoBar"]["schedule"];
    channels: HomepageChannelContent[];
    socials: HomepageSocialLinkContent[];
  };
  hero: HomepageNormalizedContent["hero"];
  services: HomepageNormalizedContent["services"];
  specialists: HomepageNormalizedContent["specialists"];
  booking: HomepageNormalizedContent["booking"];
  contact: Omit<HomepageNormalizedContent["contact"], "mapEmbedUrl" | "channels" | "socials"> & {
    mapEmbedUrl?: string;
    channels: HomepageChannelContent[];
    socials: HomepageSocialLinkContent[];
  };
  floatingActions: {
    channels: HomepageChannelContent[];
    socials: HomepageSocialLinkContent[];
  };
};

export function filterByPlacement<T extends { placements: string[] }>(items: T[], placement: string): T[] {
  return items.filter((item) => item.placements.includes(placement));
}

export function buildWhatsappHref(value: string): string {
  return `https://wa.me/${value}`;
}

export function buildPhoneHref(value: string): string {
  return `tel:+${value}`;
}

export function buildEmailHref(value: string): string {
  return `mailto:${value}`;
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
    brand: content.brand,
    infoBar: {
      location: content.infoBar.location,
      schedule: content.infoBar.schedule,
      channels: filterByPlacement(content.channels, "INFOBAR"),
      socials: filterByPlacement(content.infoBar.socials, "INFOBAR"),
    },
    hero: content.hero,
    services: content.services,
    specialists: content.specialists,
    booking: content.booking,
    contact: {
      ...content.contact,
      channels: filterByPlacement(content.channels, "FOOTER"),
      socials: filterByPlacement(content.infoBar.socials, "FOOTER"),
      mapEmbedUrl,
    },
    floatingActions: {
      channels: filterByPlacement(content.channels, "FLOATING"),
      socials: filterByPlacement(content.infoBar.socials, "FLOATING"),
    },
  };
}

export function buildBookingChannels(content: HomepageNormalizedContent) {
  return {
    channels: filterByPlacement(content.channels, "BOOKING"),
    socials: filterByPlacement(content.infoBar.socials, "BOOKING"),
  };
}
