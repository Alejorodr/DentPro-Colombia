const PRODUCTION_ENVS = new Set(["production"]);

type RuntimeStage = "vercel-production" | "vercel-preview" | "ci-e2e" | "ci" | "local";

function isLocalHttpUrl(baseUrl: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl);
}

export function isProductionRuntime(): boolean {
  return PRODUCTION_ENVS.has(process.env.NODE_ENV ?? "") || PRODUCTION_ENVS.has(process.env.VERCEL_ENV ?? "");
}

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

export function isCiRuntime(): boolean {
  return process.env.CI === "true" || process.env.CI === "1";
}

export function isE2ERuntime(): boolean {
  return process.env.RUN_E2E === "1";
}

export function getRuntimeStage(): RuntimeStage {
  if (process.env.VERCEL_ENV === "production") {
    return "vercel-production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "vercel-preview";
  }

  if (isCiRuntime() && isE2ERuntime()) {
    return "ci-e2e";
  }

  if (isCiRuntime()) {
    return "ci";
  }

  return "local";
}

export function getInferredAuthBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "";
}

export function shouldUseSecureCookies(baseUrl: string): boolean {
  if (baseUrl.startsWith("https://")) {
    return true;
  }

  if (isE2ERuntime() && isLocalHttpUrl(baseUrl)) {
    return false;
  }

  if (isVercelRuntime()) {
    return true;
  }

  if (isProductionRuntime() && isLocalHttpUrl(baseUrl)) {
    return false;
  }

  return false;
}

export function getSessionCookieName(baseUrl: string): string {
  return shouldUseSecureCookies(baseUrl) ? "__Secure-next-auth.session-token" : "next-auth.session-token";
}

export function getTrustHostSetting(): boolean {
  return process.env.AUTH_TRUST_HOST === "true" || isVercelRuntime();
}

export function isLocalE2EAuthRuntime(hostOrBaseUrl: string): boolean {
  if (!isE2ERuntime() || process.env.TEST_AUTH_BYPASS !== "1") {
    return false;
  }

  return hostOrBaseUrl.includes("localhost") || hostOrBaseUrl.includes("127.0.0.1");
}
