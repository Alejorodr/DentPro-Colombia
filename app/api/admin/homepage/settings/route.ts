import { NextResponse } from "next/server";
import { z } from "zod";

import { logApiError } from "@/app/api/_utils/observability";
import { internalServerErrorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { HOMEPAGE_DEFAULT_CONTENT, HOMEPAGE_SETTINGS_SINGLETON_ID } from "@/lib/marketing/homepage-defaults";
import { getPrismaClient } from "@/lib/prisma";
import { requireAdmin } from "../_lib";

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

// Accepts https:// URLs and base64 data URLs from local uploads.
const IMAGE_MAX_CHARS = 524288;
function optionalImageUrl() {
  return z
    .string()
    .trim()
    .max(IMAGE_MAX_CHARS)
    .refine((v) => !htmlTagPattern.test(v), "No se permite HTML.")
    .transform((v) => (v === "" ? null : v))
    .refine(
      (v) => v === null || v.startsWith("data:image/") || parseAbsoluteUrl(v),
      "URL inválida o formato no permitido.",
    );
}

const homepageSettingsSchema = z.object({
  siteName: requiredText(1, 120),
  logoUrl: optionalImageUrl(),

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
  heroImageUrl: optionalImageUrl(),
  heroImageAlt: optionalText(180),
  heroTestimonialQuote: optionalText(600),
  heroTestimonialAuthor: optionalText(120),
  heroTestimonialRole: optionalText(120),
  heroTestimonialAvatarUrl: optionalImageUrl(),
  heroHighlightTitle: optionalText(180),
  heroHighlightDescription: optionalText(600),

  servicesTitle: requiredText(1, 180),
  servicesDescription: requiredText(1, 600),
  specialistsBadge: optionalText(120),
  specialistsTitle: requiredText(1, 180),
  specialistsDescription: requiredText(1, 600),

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

  metaTitle: optionalText(120),
  metaDescription: optionalText(320),
  showSpecialists: z.boolean().optional(),
  showCampaigns: z.boolean().optional(),
});

// Partial: PATCH accepts any subset of fields (e.g. visibility-only toggles)
const homepageSettingsPatchSchema = homepageSettingsSchema.partial();
type HomepageSettingsPayload = z.infer<typeof homepageSettingsPatchSchema>;

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
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,

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

    servicesTitle: settings.servicesTitle,
    servicesDescription: settings.servicesDescription,
    specialistsBadge: settings.specialistsBadge,
    specialistsTitle: settings.specialistsTitle,
    specialistsDescription: settings.specialistsDescription,

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

    metaTitle: settings.metaTitle,
    metaDescription: settings.metaDescription,
    showSpecialists: settings.showSpecialists,
    showCampaigns: settings.showCampaigns,
  };
}

function mapPayloadToUpdateData(payload: HomepageSettingsPayload) {
  return {
    siteName: payload.siteName,
    logoUrl: payload.logoUrl,

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

    servicesTitle: payload.servicesTitle,
    servicesDescription: payload.servicesDescription,
    specialistsBadge: payload.specialistsBadge,
    specialistsTitle: payload.specialistsTitle,
    specialistsDescription: payload.specialistsDescription,

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

    metaTitle: payload.metaTitle,
    metaDescription: payload.metaDescription,
    ...(payload.showSpecialists !== undefined ? { showSpecialists: payload.showSpecialists } : {}),
    ...(payload.showCampaigns !== undefined ? { showCampaigns: payload.showCampaigns } : {}),
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const settings = await ensureSettingsRecord();
    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch (error) {
    logApiError(
      {
        event: "admin.homepage_settings.read_failed",
        route: "/api/admin/homepage/settings",
        userId: auth.sessionUser.id,
      },
      error,
    );
    return internalServerErrorResponse("No se pudo cargar la configuración del homepage.");
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    await ensureSettingsRecord();
    const current = await getPrismaClient().homepageSettings.findUnique({
      where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
      select: {
        siteName: true,
        logoUrl: true,

        infoBarLocation: true,
        infoBarHours: true,
        infoBarWhatsappHref: true,
        infoBarWhatsappLabel: true,
        infoBarEmailHref: true,
        infoBarEmailLabel: true,
        heroBadge: true,
        heroTitle: true,
        heroDescription: true,
        heroPrimaryButtonText: true,
        heroPrimaryButtonHref: true,
        heroSecondaryButtonText: true,
        heroSecondaryButtonHref: true,
        heroImageUrl: true,
        heroImageAlt: true,
        heroTestimonialQuote: true,
        heroTestimonialAuthor: true,
        heroTestimonialRole: true,
        heroTestimonialAvatarUrl: true,
        heroHighlightTitle: true,
        heroHighlightDescription: true,

        servicesTitle: true,
        servicesDescription: true,
        specialistsBadge: true,
        specialistsTitle: true,
        specialistsDescription: true,

        bookingTitle: true,
        bookingDescription: true,
        bookingSelectLabel: true,
        bookingBenefitsTitle: true,
        bookingScheduleNote: true,
        bookingConsentNote: true,
        contactTitle: true,
        contactDescription: true,
        contactPhone: true,
        contactWhatsapp: true,
        contactEmail: true,
        contactAddress: true,
        contactSupportTitle: true,
        contactLocationsTitle: true,
        contactBrand: true,
        contactMapEmbedUrl: true,
        floatingWhatsappNumber: true,
        floatingPhoneNumber: true,
        metaTitle: true,
        metaDescription: true,
        showSpecialists: true,
        showCampaigns: true,
      },
    });
    const { data: body, error } = await parseJson(request, homepageSettingsPatchSchema);
    if (error) {
      return error;
    }

    const prisma = getPrismaClient();
    const updated = await prisma.homepageSettings.update({
      where: { id: HOMEPAGE_SETTINGS_SINGLETON_ID },
      data: mapPayloadToUpdateData(body),
    });

    const changedFields = current
      ? Object.keys(body).filter((key) => body[key as keyof HomepageSettingsPayload] !== current[key as keyof typeof current])
      : Object.keys(body);
    await logAuditEvent({
      actor: {
        userId: auth.sessionUser.id,
        role: auth.sessionUser.role,
      },
      action: "homepage.settings.updated",
      resourceType: "homepage_settings",
      resourceId: HOMEPAGE_SETTINGS_SINGLETON_ID,
      status: "success",
      metadata: {
        changedFields,
        changedFieldCount: changedFields.length,
      },
    });

    return NextResponse.json({ settings: serializeSettings(updated) });
  } catch (error) {
    await logAuditEvent({
      actor: {
        userId: auth.sessionUser.id,
        role: auth.sessionUser.role,
      },
      action: "homepage.settings.updated",
      resourceType: "homepage_settings",
      resourceId: HOMEPAGE_SETTINGS_SINGLETON_ID,
      status: "failure",
    });
    logApiError(
      {
        event: "admin.homepage_settings.update_failed",
        route: "/api/admin/homepage/settings",
        userId: auth.sessionUser.id,
      },
      error,
    );
    return internalServerErrorResponse("No se pudo guardar la configuración del homepage.");
  }
}
