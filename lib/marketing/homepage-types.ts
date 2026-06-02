export const MARKETING_ICON_KEYS = [
  "Baby",
  "CalendarCheck",
  "ChartLineUp",
  "ChatCircleDots",
  "Clock",
  "CreditCard",
  "DiamondsFour",
  "EnvelopeSimple",
  "FacebookLogo",
  "Headset",
  "InstagramLogo",
  "TiktokLogo",
  "LinkedinLogo",
  "MapPin",
  "Medal",
  "Phone",
  "ShieldCheck",
  "Smiley",
  "Sparkle",
  "Stethoscope",
  "Tooth",
  "UsersThree",
  "WhatsappLogo",
] as const;

export type MarketingIconKey = (typeof MARKETING_ICON_KEYS)[number];

export type HomepageServiceContent = {
  title: string;
  description: string;
  icon: MarketingIconKey;
  highlights: string[];
};

export type HomepageSpecialistContent = {
  name: string;
  specialty: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
};

export type HomepageHeroStatContent = {
  label: string;
  description: string;
};

export type HomepageBookingOptionContent = {
  value: string;
  label: string;
};

export type HomepageBookingBenefitContent = {
  icon: MarketingIconKey;
  text: string;
};

export type HomepageSocialLinkContent = {
  href: string;
  label: string;
  icon: MarketingIconKey;
};

export type HomepageContactSupportItemContent = {
  icon: MarketingIconKey;
  text: string;
};

export type HomepageLocationContent = {
  name: string;
  description: string;
};

export type HomepageLegalLinkContent = {
  href: string;
  label: string;
};

export type HomepageNormalizedContent = {
  infoBar: {
    location: { text: string; icon: MarketingIconKey };
    schedule: { text: string; icon: MarketingIconKey };
    whatsapp: { href: string; label: string; icon: MarketingIconKey };
    email: { href: string; label: string; icon: MarketingIconKey };
    socials: HomepageSocialLinkContent[];
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    primaryCta: { href: string; label: string };
    secondaryCta: { href: string; label: string };
    stats: HomepageHeroStatContent[];
    image: { src: string; alt: string };
    testimonial: {
      quote: string;
      author: string;
      role: string;
      avatar: string;
    };
    highlight: { title: string; description: string };
  };
  services: {
    badge?: string;
    title: string;
    description: string;
    services: HomepageServiceContent[];
  };
  specialists: {
    badge: string;
    title: string;
    description: string;
    specialists: HomepageSpecialistContent[];
  };
  booking: {
    title: string;
    description: string;
    selectLabel: string;
    options: HomepageBookingOptionContent[];
    benefitsTitle: string;
    benefits: HomepageBookingBenefitContent[];
    scheduleNote: string;
    consentNote: string;
  };
  contact: {
    title: string;
    description: string;
    channels: Array<{ icon: MarketingIconKey; label: string; value: string; href?: string }>;
    socials: HomepageSocialLinkContent[];
    supportTitle: string;
    supportItems: HomepageContactSupportItemContent[];
    locationsTitle: string;
    locations: HomepageLocationContent[];
    legalLinks: HomepageLegalLinkContent[];
    brand: string;
    mapEmbedUrl: string;
  };
  floatingActions: {
    whatsappNumber: string;
    phoneNumber: string;
  };
};
