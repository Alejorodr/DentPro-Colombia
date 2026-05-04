import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { getJwtSecretString } from "@/lib/auth/jwt";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import {
  getInferredAuthBaseUrl,
  getRuntimeStage,
  getSessionCookieName,
  getTrustHostSetting,
  isProductionRuntime,
  shouldUseSecureCookies,
} from "@/lib/auth/runtime";
import { findUserById } from "@/lib/auth/users";

type AuthenticatedUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: UserRole;
  professionalId?: string | null;
  patientId?: string | null;
  defaultDashboardPath?: string;
  passwordChangedAt?: Date | null;
};

type SessionToken = JWT & {
  userId?: string;
  role?: UserRole;
  professionalId?: string | null;
  patientId?: string | null;
  defaultDashboardPath?: string;
  passwordChangedAt?: string | null;
  invalidated?: boolean;
};

const inferredBaseUrl = getInferredAuthBaseUrl();
const usesSecureCookies = shouldUseSecureCookies(inferredBaseUrl);
const trustHost = getTrustHostSetting();
const runtimeStage = getRuntimeStage();
const isStrictProductionStage = runtimeStage === "vercel-production";
const shouldEmitAuthRuntimeWarnings = runtimeStage === "vercel-production" || runtimeStage === "vercel-preview";

type AuthWarnKey = "missing-base-url" | "missing-secret" | "insecure-cookies";
const authWarningState = globalThis as typeof globalThis & {
  __authWarningsLogged?: Set<AuthWarnKey>;
};

function warnAuthOnce(key: AuthWarnKey, message: string): void {
  if (!isProductionRuntime() || !shouldEmitAuthRuntimeWarnings) return;
  if (!authWarningState.__authWarningsLogged) authWarningState.__authWarningsLogged = new Set<AuthWarnKey>();
  if (authWarningState.__authWarningsLogged.has(key)) return;
  authWarningState.__authWarningsLogged.add(key);
  console.warn(message);
}

function hasAuthSecretConfigured(): boolean {
  return Boolean(process.env.AUTH_JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET);
}

if (!inferredBaseUrl) {
  warnAuthOnce("missing-base-url", "[auth] Missing NEXTAUTH_URL or VERCEL_URL; check production auth configuration.");
}
if (!hasAuthSecretConfigured()) {
  warnAuthOnce("missing-secret", "[auth] Missing AUTH_JWT_SECRET/NEXTAUTH_SECRET/AUTH_SECRET in production.");
}
if (!usesSecureCookies) {
  warnAuthOnce(
    "insecure-cookies",
    isStrictProductionStage
      ? "[auth] Secure cookies are disabled in Vercel production; review NEXTAUTH_URL/VERCEL_URL."
      : `[auth] Secure cookies are disabled in ${runtimeStage}; verify NEXTAUTH_URL/VERCEL_URL for this environment.`,
  );
}

export const authConfig = {
  secret: getJwtSecretString(),
  useSecureCookies: usesSecureCookies,
  ...(trustHost ? { trustHost } : {}),
  cookies: {
    sessionToken: {
      name: getSessionCookieName(inferredBaseUrl),
      options: { httpOnly: true, sameSite: "strict", path: "/", secure: usesSecureCookies },
    },
  },
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = {
          email: typeof credentials?.email === "string" ? credentials.email : undefined,
          password: typeof credentials?.password === "string" ? credentials.password : undefined,
        };
        return authorizeCredentials(parsed);
      },
    }),
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      const sessionToken = token as SessionToken;
      const authUser = user as AuthenticatedUser | undefined;
      let dbUser: Awaited<ReturnType<typeof findUserById>> | null = null;

      if (authUser) {
        let resolvedRole: UserRole = "PACIENTE";
        const roleCandidate = authUser.role;
        if (isUserRole(roleCandidate ?? "")) {
          resolvedRole = roleCandidate;
        }
        sessionToken.role = resolvedRole;
        sessionToken.userId = authUser.id ?? sessionToken.userId ?? sessionToken.sub ?? "";
        sessionToken.professionalId = authUser.professionalId ?? sessionToken.professionalId;
        sessionToken.patientId = authUser.patientId ?? sessionToken.patientId;
        sessionToken.passwordChangedAt =
          authUser.passwordChangedAt instanceof Date ? authUser.passwordChangedAt.toISOString() : sessionToken.passwordChangedAt;
        sessionToken.defaultDashboardPath = authUser.defaultDashboardPath ?? sessionToken.defaultDashboardPath;
      } else if (sessionToken.sub && !sessionToken.role) {
        dbUser = await findUserById(sessionToken.sub);
        if (dbUser) {
          sessionToken.role = dbUser.role;
          sessionToken.professionalId = dbUser.professionalId ?? null;
          sessionToken.patientId = dbUser.patientId ?? null;
          sessionToken.passwordChangedAt = dbUser.passwordChangedAt ? dbUser.passwordChangedAt.toISOString() : null;
        }
      }

      if (!sessionToken.userId && sessionToken.sub) sessionToken.userId = sessionToken.sub;
      if (!sessionToken.role) sessionToken.role = "PACIENTE";

      const tokenIssuedAt = typeof sessionToken.iat === "number" ? sessionToken.iat * 1000 : null;
      if (sessionToken.sub) {
        if (!dbUser) dbUser = await findUserById(sessionToken.sub);
        sessionToken.invalidated = Boolean(dbUser?.passwordChangedAt && tokenIssuedAt && tokenIssuedAt < dbUser.passwordChangedAt.getTime());
      }

      return sessionToken;
    },
    async session({ session, token }) {
      const sessionToken = token as SessionToken;
      if (sessionToken.invalidated) {
        return session;
      }

      const resolvedRole = isUserRole(sessionToken.role ?? "") ? sessionToken.role : "PACIENTE";
      const userId = typeof sessionToken.userId === "string" ? sessionToken.userId : typeof sessionToken.sub === "string" ? sessionToken.sub : "";

      session.user = {
        id: userId,
        name: session.user?.name ?? null,
        email: session.user?.email ?? "",
        image: session.user?.image ?? null,
        role: resolvedRole,
        professionalId: sessionToken.professionalId ?? null,
        patientId: sessionToken.patientId ?? null,
        ...(sessionToken.defaultDashboardPath ? { defaultDashboardPath: sessionToken.defaultDashboardPath } : {}),
      };
      return session;
    },
  },
  pages: { signIn: "/auth/login" },
} satisfies NextAuthConfig;
