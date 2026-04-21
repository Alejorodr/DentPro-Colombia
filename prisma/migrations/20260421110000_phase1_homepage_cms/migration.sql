-- Phase 1 homepage CMS foundation
CREATE TABLE "HomepageSettings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "infoBarLocation" TEXT NOT NULL,
    "infoBarPhone" TEXT,
    "infoBarHours" TEXT,
    "infoBarWhatsappHref" TEXT,
    "infoBarWhatsappLabel" TEXT,
    "infoBarEmailHref" TEXT,
    "infoBarEmailLabel" TEXT,
    "heroBadge" TEXT,
    "heroTitle" TEXT NOT NULL,
    "heroDescription" TEXT NOT NULL,
    "heroPrimaryButtonText" TEXT,
    "heroPrimaryButtonHref" TEXT,
    "heroSecondaryButtonText" TEXT,
    "heroSecondaryButtonHref" TEXT,
    "heroImageUrl" TEXT,
    "heroImageAlt" TEXT,
    "heroTestimonialQuote" TEXT,
    "heroTestimonialAuthor" TEXT,
    "heroTestimonialRole" TEXT,
    "heroTestimonialAvatarUrl" TEXT,
    "heroHighlightTitle" TEXT,
    "heroHighlightDescription" TEXT,
    "servicesTitle" TEXT NOT NULL,
    "servicesDescription" TEXT NOT NULL,
    "specialistsBadge" TEXT,
    "specialistsTitle" TEXT NOT NULL,
    "specialistsDescription" TEXT NOT NULL,
    "bookingTitle" TEXT NOT NULL,
    "bookingDescription" TEXT NOT NULL,
    "bookingSelectLabel" TEXT,
    "bookingBenefitsTitle" TEXT,
    "bookingScheduleNote" TEXT,
    "bookingConsentNote" TEXT,
    "contactTitle" TEXT NOT NULL,
    "contactDescription" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactWhatsapp" TEXT,
    "contactEmail" TEXT,
    "contactAddress" TEXT,
    "contactHours" TEXT,
    "contactSupportTitle" TEXT,
    "contactLocationsTitle" TEXT,
    "contactBrand" TEXT,
    "contactMapEmbedUrl" TEXT,
    "floatingWhatsappNumber" TEXT,
    "floatingPhoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageService" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageServiceHighlight" (
    "id" TEXT NOT NULL,
    "homepageServiceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageServiceHighlight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageSpecialist" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "bioShort" TEXT NOT NULL,
    "imageUrl" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSpecialist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageHeroStat" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageHeroStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageBookingOption" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageBookingOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageBookingBenefit" (
    "id" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageBookingBenefit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageSocialLink" (
    "id" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageSocialLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageContactSupportItem" (
    "id" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageContactSupportItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomepageLegalLink" (
    "id" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageLegalLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageBookingOption_value_key" ON "HomepageBookingOption"("value");

CREATE INDEX "HomepageService_isActive_sortOrder_idx" ON "HomepageService"("isActive", "sortOrder");
CREATE INDEX "HomepageServiceHighlight_homepageServiceId_sortOrder_idx" ON "HomepageServiceHighlight"("homepageServiceId", "sortOrder");
CREATE INDEX "HomepageSpecialist_isActive_sortOrder_idx" ON "HomepageSpecialist"("isActive", "sortOrder");
CREATE INDEX "HomepageHeroStat_isActive_sortOrder_idx" ON "HomepageHeroStat"("isActive", "sortOrder");
CREATE INDEX "HomepageBookingOption_isActive_sortOrder_idx" ON "HomepageBookingOption"("isActive", "sortOrder");
CREATE INDEX "HomepageBookingBenefit_isActive_sortOrder_idx" ON "HomepageBookingBenefit"("isActive", "sortOrder");
CREATE INDEX "HomepageSocialLink_isActive_sortOrder_idx" ON "HomepageSocialLink"("isActive", "sortOrder");
CREATE INDEX "HomepageContactSupportItem_isActive_sortOrder_idx" ON "HomepageContactSupportItem"("isActive", "sortOrder");
CREATE INDEX "HomepageLocation_isActive_sortOrder_idx" ON "HomepageLocation"("isActive", "sortOrder");
CREATE INDEX "HomepageLegalLink_isActive_sortOrder_idx" ON "HomepageLegalLink"("isActive", "sortOrder");

ALTER TABLE "HomepageServiceHighlight"
  ADD CONSTRAINT "HomepageServiceHighlight_homepageServiceId_fkey"
  FOREIGN KEY ("homepageServiceId") REFERENCES "HomepageService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
