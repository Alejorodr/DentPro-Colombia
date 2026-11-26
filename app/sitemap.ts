import type { MetadataRoute } from "next";

import { SERVICES } from "@/lib/marketing/services-data";
import { SITE_URL } from "@/lib/site/site-url";

const siteUrl = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/appointments/new`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...SERVICES.map((service) => ({
      url: `${siteUrl}/servicios/${service.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
