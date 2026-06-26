import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const csp = [
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  `script-src 'self'${isProd ? " 'unsafe-inline'" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self' https:${isProd ? "" : " http: ws: wss:"}`,
  "frame-src 'self' https://www.google.com",
].join("; ");


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
  { key: isProd ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
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
export default nextConfig;
