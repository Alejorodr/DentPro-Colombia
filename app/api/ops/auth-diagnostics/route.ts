import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getInferredAuthBaseUrl, isProductionRuntime, isVercelRuntime, shouldUseSecureCookies } from "@/lib/auth/runtime";
import {
  enforceOpsRateLimit,
  getOpsKey,
  isOpsIpAllowed,
  respondGenericError,
  respondNotFound,
  respondUnauthorized,
} from "../_utils";

type DiagnosticsResponse = {
  nodeEnv: string;
  vercelEnv: string | null;
  isVercel: boolean;
  inferredBaseUrl: string;
  hasNextAuthUrl: boolean;
  hasAuthSecret: boolean;
  usesSecureCookies: boolean;
  dbConfigured: boolean;
  dbConnectOk: boolean;
  notes: string[];
};

function sanitizeBaseUrl(url: string): string {
  if (!url) {
    return "";
  }
  return url.split("?")[0] ?? url;
}

function hasAuthSecret(): boolean {
  return Boolean(
    process.env.AUTH_JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  );
}

export async function GET(request: Request) {
  const opsKey = getOpsKey();
  if (!opsKey) {
    return respondNotFound();
  }

  if (!isOpsIpAllowed(request)) {
    return respondUnauthorized();
  }

  const rateLimitResponse = await enforceOpsRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const headerKey = request.headers.get("x-ops-key")?.trim();
  if (!headerKey || headerKey !== opsKey) {
    return respondUnauthorized();
  }

  const inferredBaseUrl = getInferredAuthBaseUrl();
  const usesSecureCookies = shouldUseSecureCookies(inferredBaseUrl);
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const dbConfigured = databaseUrl.length > 0;
  let dbConnectOk = false;

  if (dbConfigured) {
    try {
      const prisma = getPrismaClient();
      await prisma.user.count();
      dbConnectOk = true;
    } catch {
      dbConnectOk = false;
    }
  }

  const notes: string[] = [];
  if (!process.env.NEXTAUTH_URL && !process.env.VERCEL_URL) {
    notes.push("NEXTAUTH_URL or VERCEL_URL missing.");
  }
  if (!hasAuthSecret()) {
    notes.push("AUTH_JWT_SECRET/NEXTAUTH_SECRET/AUTH_SECRET missing.");
  }
  if (!dbConfigured) {
    notes.push("DATABASE_URL missing.");
  } else if (!dbConnectOk) {
    notes.push("DB connection failed.");
  }
  if (!usesSecureCookies && isProductionRuntime()) {
    notes.push("Secure cookies disabled in production.");
  }

  const response: DiagnosticsResponse = {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercelEnv: process.env.VERCEL_ENV ?? null,
    isVercel: isVercelRuntime(),
    inferredBaseUrl: sanitizeBaseUrl(inferredBaseUrl),
    hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
    hasAuthSecret: hasAuthSecret(),
    usesSecureCookies,
    dbConfigured,
    dbConnectOk,
    notes,
  };

  try {
    return NextResponse.json(response);
  } catch {
    return respondGenericError();
  }
}
