import { SITE_URL } from "@/lib/site/site-url";
import type { MetadataRoute } from "next";

const siteUrl = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/portal", "/api", "/auth"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
