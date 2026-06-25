import type { MetadataRoute } from "next";

import { SERVICES } from "@/lib/marketing/services-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentprocolombia.com";

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
    {
      url: `${siteUrl}/#servicios`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/#especialistas`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/#agenda`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/#contacto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...SERVICES.map((service) => ({
      url: `${siteUrl}/servicios/${service.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
