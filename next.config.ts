import type { NextConfig } from "next";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

const isProd = process.env.NODE_ENV === "production";
// Content-Security-Policy is NOT set here: it needs a per-request nonce, so
// proxy.ts builds it (lib/security/csp.ts) for every HTML response — enforced
// in production, report-only in development. See H2 in
// docs/security/plan-refuerzo-2026-11-20.md.


const sentryOtelWarningPattern = /Critical dependency: the request of a dependency is an expression/;

const securityHeaders = [
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  typescript: {
    // Test files aren't part of the shipped app; type-check them separately
    // via `pnpm run typecheck`, not as part of the production build.
    tsconfigPath: "./tsconfig.build.json",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  webpack(config) {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      (warning: { message?: string; module?: { resource?: string } } | string) => {
        const warningObject = typeof warning === "string" ? undefined : warning;
        const warningMessage = typeof warningObject?.message === "string" ? warningObject.message : "";
        const warningModule = typeof warningObject?.module?.resource === "string" ? warningObject.module.resource : "";
        const isKnownSentryOrOtelWarning =
          sentryOtelWarningPattern.test(warningMessage) &&
          (warningModule.includes("@sentry") || warningModule.includes("@opentelemetry"));
        return isKnownSentryOrOtelWarning;
      },
    ];

    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};
export default withBundleAnalyzer(nextConfig);
