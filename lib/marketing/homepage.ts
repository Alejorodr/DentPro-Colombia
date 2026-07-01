import type { PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";
import {
  HOMEPAGE_DEFAULT_CONTENT,
  HOMEPAGE_SETTINGS_SINGLETON_ID,
  sanitizeMarketingIcon,
} from "@/lib/marketing/homepage-defaults";
import type { HomepageNormalizedContent } from "@/lib/marketing/homepage-types";

function normalizeMapEmbed(url: string | null | undefined) {
  if (!url) {
    return HOMEPAGE_DEFAULT_CONTENT.contact.mapEmbedUrl;
  }

  // Fase 1: solo guardamos URL del embed, no HTML libre.
  return url;
}

export async function getHomepageContent(prismaClient?: PrismaClient): Promise<HomepageNormalizedContent> {
  if (!prismaClient && !process.env.DATABASE_URL) {
    return HOMEPAGE_DEFAULT_CONTENT;
  }
  const prisma = prismaClient ?? getPrismaClient();

  const [
    settings,
    services,
    specialists,
    heroStats,
    bookingOptions,
    bookingBenefits,
    socials,
    supportItems,
    locations,
    legalLinks,
    faqs,
  ] = await prisma.$transaction([
    prisma.homepageSettings.findUnique({ where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID } }),
    prisma.homepageService.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        highlights: {
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.homepageSpecialist.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageHeroStat.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageBookingOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageBookingBenefit.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageSocialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageContactSupportItem.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageLocation.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageLegalLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.homepageFaq.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const fallback = HOMEPAGE_DEFAULT_CONTENT;

  const rawSiteName = settings?.siteName ?? fallback.brand.name;
  const initials = rawSiteName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return {
    brand: {
      name: rawSiteName,
      initials: initials || fallback.brand.initials,
      logoUrl: settings?.logoUrl ?? fallback.brand.logoUrl,
    },
    infoBar: {
      location: {
        text: settings?.infoBarLocation ?? fallback.infoBar.location.text,
        icon: "MapPin",
      },
      schedule: {
        text: settings?.infoBarHours ?? fallback.infoBar.schedule.text,
        icon: "Clock",
      },
      whatsapp: {
        href: settings?.infoBarWhatsappHref ?? fallback.infoBar.whatsapp.href,
        label: settings?.infoBarWhatsappLabel ?? fallback.infoBar.whatsapp.label,
        icon: "ChatCircleDots",
      },
      email: {
        href: settings?.infoBarEmailHref ?? fallback.infoBar.email.href,
        label: settings?.infoBarEmailLabel ?? fallback.infoBar.email.label,
        icon: "EnvelopeSimple",
      },
      socials:
        socials.length > 0
          ? socials.map((social) => ({
              href: social.href,
              label: social.label,
              icon: sanitizeMarketingIcon(social.iconKey, "InstagramLogo"),
            }))
          : fallback.infoBar.socials,
    },
    hero: {
      badge: settings?.heroBadge ?? fallback.hero.badge,
      title: settings?.heroTitle ?? fallback.hero.title,
      description: settings?.heroDescription ?? fallback.hero.description,
      primaryCta: {
        href: settings?.heroPrimaryButtonHref ?? fallback.hero.primaryCta.href,
        label: settings?.heroPrimaryButtonText ?? fallback.hero.primaryCta.label,
      },
      secondaryCta: {
        href: settings?.heroSecondaryButtonHref ?? fallback.hero.secondaryCta.href,
        label: settings?.heroSecondaryButtonText ?? fallback.hero.secondaryCta.label,
      },
      stats:
        heroStats.length > 0
          ? heroStats.map((item) => ({ label: item.label, description: item.description }))
          : fallback.hero.stats,
      image: {
        src: settings?.heroImageUrl ?? fallback.hero.image.src,
        alt: settings?.heroImageAlt ?? fallback.hero.image.alt,
      },
      testimonial: {
        quote: settings?.heroTestimonialQuote ?? fallback.hero.testimonial.quote,
        author: settings?.heroTestimonialAuthor ?? fallback.hero.testimonial.author,
        role: settings?.heroTestimonialRole ?? fallback.hero.testimonial.role,
        avatar: settings?.heroTestimonialAvatarUrl ?? fallback.hero.testimonial.avatar,
      },
      highlight: {
        title: settings?.heroHighlightTitle ?? fallback.hero.highlight.title,
        description: settings?.heroHighlightDescription ?? fallback.hero.highlight.description,
      },
    },
    services: {
      title: settings?.servicesTitle ?? fallback.services.title,
      description: settings?.servicesDescription ?? fallback.services.description,
      services:
        services.length > 0
          ? services.map((service) => ({
              title: service.title,
              description: service.description,
              icon: sanitizeMarketingIcon(service.iconKey, "Sparkle"),
              highlights:
                service.highlights.length > 0
                  ? service.highlights.map((highlight) => highlight.text)
                  : fallback.services.services.find((item) => item.title === service.title)?.highlights ?? [],
            }))
          : fallback.services.services,
    },
    specialists: {
      badge: settings?.specialistsBadge ?? fallback.specialists.badge,
      title: settings?.specialistsTitle ?? fallback.specialists.title,
      description: settings?.specialistsDescription ?? fallback.specialists.description,
      specialists:
        specialists.length > 0
          ? specialists.map((specialist) => ({
              name: specialist.fullName,
              specialty: specialist.specialty,
              description: specialist.bioShort,
              image: {
                src: specialist.imageUrl ?? fallback.specialists.specialists[0]?.image.src ?? "",
                alt: specialist.altText ?? specialist.fullName,
              },
            }))
          : fallback.specialists.specialists,
    },
    booking: {
      title: settings?.bookingTitle ?? fallback.booking.title,
      description: settings?.bookingDescription ?? fallback.booking.description,
      selectLabel: settings?.bookingSelectLabel ?? fallback.booking.selectLabel,
      options:
        bookingOptions.length > 0
          ? bookingOptions.map((option) => ({ value: option.value, label: option.label }))
          : fallback.booking.options,
      benefitsTitle: settings?.bookingBenefitsTitle ?? fallback.booking.benefitsTitle,
      benefits:
        bookingBenefits.length > 0
          ? bookingBenefits.map((benefit) => ({
              icon: sanitizeMarketingIcon(benefit.iconKey, "CalendarCheck"),
              text: benefit.text,
            }))
          : fallback.booking.benefits,
      scheduleNote: settings?.bookingScheduleNote ?? fallback.booking.scheduleNote,
      consentNote: settings?.bookingConsentNote ?? fallback.booking.consentNote,
    },
    contact: {
      title: settings?.contactTitle ?? fallback.contact.title,
      description: settings?.contactDescription ?? fallback.contact.description,
      channels: [
        {
          icon: "Phone",
          label: "Teléfono",
          value: settings?.contactPhone ?? fallback.contact.channels[0].value,
          href: settings?.contactPhone ? `tel:${settings.contactPhone}` : fallback.contact.channels[0].href,
        },
        {
          icon: "WhatsappLogo",
          label: "WhatsApp",
          value: settings?.contactWhatsapp ?? fallback.contact.channels[1].value,
          href:
            settings?.floatingWhatsappNumber
              ? `https://wa.me/${settings.floatingWhatsappNumber}`
              : fallback.contact.channels[1].href,
        },
        {
          icon: "EnvelopeSimple",
          label: "Email",
          value: settings?.contactEmail ?? fallback.contact.channels[2].value,
          href: settings?.contactEmail ? `mailto:${settings.contactEmail}` : fallback.contact.channels[2].href,
        },
        {
          icon: "MapPin",
          label: "Ubicación",
          value: settings?.contactAddress ?? fallback.contact.channels[3].value,
        },
      ],
      socials:
        socials.length > 0
          ? socials.map((social) => ({
              href: social.href,
              label: social.label,
              icon: sanitizeMarketingIcon(social.iconKey, "InstagramLogo"),
            }))
          : fallback.contact.socials,
      supportTitle: settings?.contactSupportTitle ?? fallback.contact.supportTitle,
      supportItems:
        supportItems.length > 0
          ? supportItems.map((item) => ({
              icon: sanitizeMarketingIcon(item.iconKey, "Headset"),
              text: item.text,
            }))
          : fallback.contact.supportItems,
      locationsTitle: settings?.contactLocationsTitle ?? fallback.contact.locationsTitle,
      locations:
        locations.length > 0
          ? locations.map((location) => ({ name: location.name, description: location.description }))
          : fallback.contact.locations,
      legalLinks:
        legalLinks.length > 0
          ? legalLinks.map((link) => ({ href: link.href, label: link.label }))
          : fallback.contact.legalLinks,
      brand: settings?.contactBrand ?? fallback.contact.brand,
      mapEmbedUrl: normalizeMapEmbed(settings?.contactMapEmbedUrl),
    },
    floatingActions: {
      whatsappNumber: settings?.floatingWhatsappNumber ?? fallback.floatingActions.whatsappNumber,
      phoneNumber: settings?.floatingPhoneNumber ?? fallback.floatingActions.phoneNumber,
    },
    faqs:
      faqs.length > 0
        ? faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))
        : fallback.faqs,
    seo: {
      metaTitle: settings?.metaTitle ?? null,
      metaDescription: settings?.metaDescription ?? null,
    },
    showSpecialists: settings?.showSpecialists ?? true,
    showCampaigns: settings?.showCampaigns ?? true,
  };
}

export async function bootstrapHomepageContent(prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? getPrismaClient();
  const source = HOMEPAGE_DEFAULT_CONTENT;

  await prisma.homepageSettings.upsert({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
    update: {},
    create: {
      id: HOMEPAGE_SETTINGS_SINGLETON_ID,
      siteName: "DentPro Colombia",
      infoBarLocation: source.infoBar.location.text,
      infoBarPhone: source.contact.channels[0].value,
      infoBarHours: source.infoBar.schedule.text,
      infoBarWhatsappHref: source.infoBar.whatsapp.href,
      infoBarWhatsappLabel: source.infoBar.whatsapp.label,
      infoBarEmailHref: source.infoBar.email.href,
      infoBarEmailLabel: source.infoBar.email.label,
      heroBadge: source.hero.badge,
      heroTitle: source.hero.title,
      heroDescription: source.hero.description,
      heroPrimaryButtonText: source.hero.primaryCta.label,
      heroPrimaryButtonHref: source.hero.primaryCta.href,
      heroSecondaryButtonText: source.hero.secondaryCta.label,
      heroSecondaryButtonHref: source.hero.secondaryCta.href,
      heroImageUrl: source.hero.image.src,
      heroImageAlt: source.hero.image.alt,
      heroTestimonialQuote: source.hero.testimonial.quote,
      heroTestimonialAuthor: source.hero.testimonial.author,
      heroTestimonialRole: source.hero.testimonial.role,
      heroTestimonialAvatarUrl: source.hero.testimonial.avatar,
      heroHighlightTitle: source.hero.highlight.title,
      heroHighlightDescription: source.hero.highlight.description,
      servicesTitle: source.services.title,
      servicesDescription: source.services.description,
      specialistsBadge: source.specialists.badge,
      specialistsTitle: source.specialists.title,
      specialistsDescription: source.specialists.description,
      bookingTitle: source.booking.title,
      bookingDescription: source.booking.description,
      bookingSelectLabel: source.booking.selectLabel,
      bookingBenefitsTitle: source.booking.benefitsTitle,
      bookingScheduleNote: source.booking.scheduleNote,
      bookingConsentNote: source.booking.consentNote,
      contactTitle: source.contact.title,
      contactDescription: source.contact.description,
      contactPhone: source.contact.channels[0].value,
      contactWhatsapp: source.contact.channels[1].value,
      contactEmail: source.contact.channels[2].value,
      contactAddress: source.contact.channels[3].value,
      contactHours: source.infoBar.schedule.text,
      contactSupportTitle: source.contact.supportTitle,
      contactLocationsTitle: source.contact.locationsTitle,
      contactBrand: source.contact.brand,
      contactMapEmbedUrl: source.contact.mapEmbedUrl,
      floatingWhatsappNumber: source.floatingActions.whatsappNumber,
      floatingPhoneNumber: source.floatingActions.phoneNumber,
    },
  });

  if ((await prisma.homepageService.count()) === 0) {
    for (const [index, service] of source.services.services.entries()) {
      await prisma.homepageService.create({
        data: {
          title: service.title,
          description: service.description,
          iconKey: service.icon,
          sortOrder: index,
          isActive: true,
          highlights: {
            create: service.highlights.map((highlight, highlightIndex) => ({
              text: highlight,
              sortOrder: highlightIndex,
            })),
          },
        },
      });
    }
  }

  if ((await prisma.homepageSpecialist.count()) === 0) {
    await prisma.homepageSpecialist.createMany({
      data: source.specialists.specialists.map((specialist, index) => ({
        fullName: specialist.name,
        specialty: specialist.specialty,
        bioShort: specialist.description,
        imageUrl: specialist.image.src,
        altText: specialist.image.alt,
        sortOrder: index,
        isActive: true,
      })),
    });
  }

  if ((await prisma.homepageHeroStat.count()) === 0) {
    await prisma.homepageHeroStat.createMany({
      data: source.hero.stats.map((item, index) => ({
        label: item.label,
        description: item.description,
        sortOrder: index,
        isActive: true,
      })),
    });
  }

  if ((await prisma.homepageBookingOption.count()) === 0) {
    await prisma.homepageBookingOption.createMany({
      data: source.booking.options.map((option, index) => ({
        value: option.value,
        label: option.label,
        sortOrder: index,
        isActive: true,
      })),
    });
  }

  if ((await prisma.homepageBookingBenefit.count()) === 0) {
    await prisma.homepageBookingBenefit.createMany({
      data: source.booking.benefits.map((benefit, index) => ({
        iconKey: benefit.icon,
        text: benefit.text,
        sortOrder: index,
        isActive: true,
      })),
    });
  }

  if ((await prisma.homepageSocialLink.count()) === 0) {
    await prisma.homepageSocialLink.createMany({
      data: source.contact.socials.map((social, index) => ({
        href: social.href,
        label: social.label,
        iconKey: social.icon,
        sortOrder: index,
        isActive: true,
      })),
    });
  }

  if ((await prisma.homepageContactSupportItem.count()) === 0) {
    await prisma.homepageContactSupportItem.createMany({
      data: source.contact.supportItems.map((item, index) => ({
        iconKey: item.icon,
        text: item.text,
        sortOrder: index,
        isActive: true,
      })),
    });
  }

  if ((await prisma.homepageLocation.count()) === 0) {
    await prisma.homepageLocation.createMany({
      data: source.contact.locations.map((location, index) => ({
        name: location.name,
        description: location.description,
        sortOrder: index,
        isActive: true,
      })),
    });
  }

  if ((await prisma.homepageLegalLink.count()) === 0) {
    await prisma.homepageLegalLink.createMany({
      data: source.contact.legalLinks.map((link, index) => ({
        href: link.href,
        label: link.label,
        sortOrder: index,
        isActive: true,
      })),
    });
  }

  if ((await prisma.homepageFaq.count()) === 0) {
    await prisma.homepageFaq.createMany({
      data: source.faqs.map((faq, index) => ({
        question: faq.question,
        answer: faq.answer,
        sortOrder: index,
        isActive: true,
      })),
    });
  }
}
