import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { HOMEPAGE_DEFAULT_CONTENT, HOMEPAGE_SETTINGS_SINGLETON_ID } from "@/lib/marketing/homepage-defaults";
import { getPrismaClient } from "@/lib/prisma";

const htmlTagPattern = /<[^>]+>/;

const noHtml = (value: string) => !htmlTagPattern.test(value);

function parseAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function parseHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseHrefUrl(value: string) {
  if (value.startsWith("#") || value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function requiredText(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(noHtml, "No se permite HTML.");
}

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine(noHtml, "No se permite HTML.")
    .transform((value) => (value === "" ? null : value));
}

function optionalHref(max: number) {
  return optionalText(max).refine((value) => value === null || parseHrefUrl(value), "URL inválida.");
}

function optionalAbsoluteUrl(max: number) {
  return optionalText(max).refine((value) => value === null || parseAbsoluteUrl(value), "URL inválida.");
}

const homepageSettingsSchema = z.object({
  infoBarLocation: requiredText(1, 180),
  infoBarHours: optionalText(180),
  infoBarWhatsappHref: optionalHref(500),
  infoBarWhatsappLabel: optionalText(120),
  infoBarEmailHref: optionalHref(500),
  infoBarEmailLabel: optionalText(120),

  heroBadge: optionalText(180),
  heroTitle: requiredText(1, 180),
  heroDescription: requiredText(1, 1200),
  heroPrimaryButtonText: optionalText(80),
  heroPrimaryButtonHref: optionalHref(500),
  heroSecondaryButtonText: optionalText(80),
  heroSecondaryButtonHref: optionalHref(500),
  heroImageUrl: optionalAbsoluteUrl(500),
  heroImageAlt: optionalText(180),
  heroTestimonialQuote: optionalText(600),
  heroTestimonialAuthor: optionalText(120),
  heroTestimonialRole: optionalText(120),
  heroTestimonialAvatarUrl: optionalAbsoluteUrl(500),
  heroHighlightTitle: optionalText(180),
  heroHighlightDescription: optionalText(600),

  bookingTitle: requiredText(1, 180),
  bookingDescription: requiredText(1, 1200),
  bookingSelectLabel: optionalText(180),
  bookingBenefitsTitle: optionalText(180),
  bookingScheduleNote: optionalText(600),
  bookingConsentNote: optionalText(600),

  contactTitle: requiredText(1, 180),
  contactDescription: requiredText(1, 1200),
  contactPhone: optionalText(60),
  contactWhatsapp: optionalText(60),
  contactEmail: optionalText(200).refine(
    (value) => value === null || z.string().email().safeParse(value).success,
    "Email inválido.",
  ),
  contactAddress: optionalText(240),
  contactSupportTitle: optionalText(180),
  contactLocationsTitle: optionalText(180),
  contactBrand: optionalText(120),
  contactMapEmbedUrl: optionalText(500).refine(
    (value) => value === null || parseHttpsUrl(value),
    "Debe ser una URL HTTPS válida.",
  ),

  floatingWhatsappNumber: optionalText(30),
  floatingPhoneNumber: optionalText(30),
});

type HomepageSettingsPayload = z.infer<typeof homepageSettingsSchema>;

async function ensureSettingsRecord() {
  const prisma = getPrismaClient();
  const source = HOMEPAGE_DEFAULT_CONTENT;

  return prisma.homepageSettings.upsert({
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
}

function serializeSettings(settings: Awaited<ReturnType<typeof ensureSettingsRecord>>) {
  return {
    infoBarLocation: settings.infoBarLocation,
    infoBarHours: settings.infoBarHours,
    infoBarWhatsappHref: settings.infoBarWhatsappHref,
    infoBarWhatsappLabel: settings.infoBarWhatsappLabel,
    infoBarEmailHref: settings.infoBarEmailHref,
    infoBarEmailLabel: settings.infoBarEmailLabel,

    heroBadge: settings.heroBadge,
    heroTitle: settings.heroTitle,
    heroDescription: settings.heroDescription,
    heroPrimaryButtonText: settings.heroPrimaryButtonText,
    heroPrimaryButtonHref: settings.heroPrimaryButtonHref,
    heroSecondaryButtonText: settings.heroSecondaryButtonText,
    heroSecondaryButtonHref: settings.heroSecondaryButtonHref,
    heroImageUrl: settings.heroImageUrl,
    heroImageAlt: settings.heroImageAlt,
    heroTestimonialQuote: settings.heroTestimonialQuote,
    heroTestimonialAuthor: settings.heroTestimonialAuthor,
    heroTestimonialRole: settings.heroTestimonialRole,
    heroTestimonialAvatarUrl: settings.heroTestimonialAvatarUrl,
    heroHighlightTitle: settings.heroHighlightTitle,
    heroHighlightDescription: settings.heroHighlightDescription,

    bookingTitle: settings.bookingTitle,
    bookingDescription: settings.bookingDescription,
    bookingSelectLabel: settings.bookingSelectLabel,
    bookingBenefitsTitle: settings.bookingBenefitsTitle,
    bookingScheduleNote: settings.bookingScheduleNote,
    bookingConsentNote: settings.bookingConsentNote,

    contactTitle: settings.contactTitle,
    contactDescription: settings.contactDescription,
    contactPhone: settings.contactPhone,
    contactWhatsapp: settings.contactWhatsapp,
    contactEmail: settings.contactEmail,
    contactAddress: settings.contactAddress,
    contactSupportTitle: settings.contactSupportTitle,
    contactLocationsTitle: settings.contactLocationsTitle,
    contactBrand: settings.contactBrand,
    contactMapEmbedUrl: settings.contactMapEmbedUrl,

    floatingWhatsappNumber: settings.floatingWhatsappNumber,
    floatingPhoneNumber: settings.floatingPhoneNumber,
  };
}

function mapPayloadToUpdateData(payload: HomepageSettingsPayload) {
  return {
    infoBarLocation: payload.infoBarLocation,
    infoBarHours: payload.infoBarHours,
    infoBarWhatsappHref: payload.infoBarWhatsappHref,
    infoBarWhatsappLabel: payload.infoBarWhatsappLabel,
    infoBarEmailHref: payload.infoBarEmailHref,
    infoBarEmailLabel: payload.infoBarEmailLabel,
    heroBadge: payload.heroBadge,
    heroTitle: payload.heroTitle,
    heroDescription: payload.heroDescription,
    heroPrimaryButtonText: payload.heroPrimaryButtonText,
    heroPrimaryButtonHref: payload.heroPrimaryButtonHref,
    heroSecondaryButtonText: payload.heroSecondaryButtonText,
    heroSecondaryButtonHref: payload.heroSecondaryButtonHref,
    heroImageUrl: payload.heroImageUrl,
    heroImageAlt: payload.heroImageAlt,
    heroTestimonialQuote: payload.heroTestimonialQuote,
    heroTestimonialAuthor: payload.heroTestimonialAuthor,
    heroTestimonialRole: payload.heroTestimonialRole,
    heroTestimonialAvatarUrl: payload.heroTestimonialAvatarUrl,
    heroHighlightTitle: payload.heroHighlightTitle,
    heroHighlightDescription: payload.heroHighlightDescription,
    bookingTitle: payload.bookingTitle,
    bookingDescription: payload.bookingDescription,
    bookingSelectLabel: payload.bookingSelectLabel,
    bookingBenefitsTitle: payload.bookingBenefitsTitle,
    bookingScheduleNote: payload.bookingScheduleNote,
    bookingConsentNote: payload.bookingConsentNote,
    contactTitle: payload.contactTitle,
    contactDescription: payload.contactDescription,
    contactPhone: payload.contactPhone,
    contactWhatsapp: payload.contactWhatsapp,
    contactEmail: payload.contactEmail,
    contactAddress: payload.contactAddress,
    contactSupportTitle: payload.contactSupportTitle,
    contactLocationsTitle: payload.contactLocationsTitle,
    contactBrand: payload.contactBrand,
    contactMapEmbedUrl: payload.contactMapEmbedUrl,
    floatingWhatsappNumber: payload.floatingWhatsappNumber,
    floatingPhoneNumber: payload.floatingPhoneNumber,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  const settings = await ensureSettingsRecord();
  return NextResponse.json({ settings: serializeSettings(settings) });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No autorizado.", 401);
  }

  await ensureSettingsRecord();
  const { data: body, error } = await parseJson(request, homepageSettingsSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const updated = await prisma.homepageSettings.update({
    where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
    data: mapPayloadToUpdateData(body),
  });

  return NextResponse.json({ settings: serializeSettings(updated) });
}
