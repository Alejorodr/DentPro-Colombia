const PRODUCTION_ENVS = new Set(["production"]);

export function isProductionRuntime(): boolean {
  return PRODUCTION_ENVS.has(process.env.NODE_ENV ?? "") || PRODUCTION_ENVS.has(process.env.VERCEL_ENV ?? "");
}

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
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
  if (isProductionRuntime()) {
    return true;
  }
  return baseUrl.startsWith("https://");
}

export function getTrustHostSetting(): boolean {
  return process.env.AUTH_TRUST_HOST === "true" || isVercelRuntime();
}
