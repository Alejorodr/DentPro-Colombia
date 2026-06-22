import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { getJwtSecretString } from "@/lib/auth/jwt";
import { getDefaultDashboardPath, isUserRole, type UserRole } from "@/lib/auth/roles";
import {
  getInferredAuthBaseUrl,
  getRuntimeStage,
  getSessionCookieName,
  getTrustHostSetting,
  isProductionRuntime,
  shouldUseSecureCookies,
} from "@/lib/auth/runtime";

import { findUserByEmail, findUserById } from "@/lib/auth/users";
import { logAuditEvent } from "@/lib/audit";
import { validateGoogleSignIn } from "@/lib/auth/google-signin-guard";

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

function resolveTokenRole(value: unknown): UserRole {
  return typeof value == "string" && isUserRole(value) ? value : "PACIENTE";
}

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
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      const autoCreate = process.env.GOOGLE_AUTO_CREATE_PATIENTS === "true";
      const allowed = await validateGoogleSignIn(
        profile as { email?: string; email_verified?: boolean } | undefined,
        findUserByEmail,
        autoCreate,
      );

      if (!allowed) {
        const profileEmail =
          typeof profile?.email === "string" ? profile.email.toLowerCase() : "";
        void logAuditEvent({
          action: "auth.oauth.signin_rejected",
          resourceType: "auth",
          status: "failure",
          metadata: {
            provider: "google",
            emailDomain: profileEmail.split("@")[1] ?? null,
            reason: !profileEmail ? "missing_email" : "access_denied",
          },
        });
        return false;
      }

      return true;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      const sessionToken = token as SessionToken;
      const authUser = user as AuthenticatedUser | undefined;
      let dbUser: Awaited<ReturnType<typeof findUserById>> | null = null;

      const userIdCandidate = authUser?.id ?? sessionToken.userId ?? sessionToken.sub ?? "";
      const shouldRefreshFromDb =
        !!userIdCandidate &&
        (!authUser || !authUser.role || (!authUser.professionalId && !authUser.patientId) || !authUser.defaultDashboardPath);
      if (shouldRefreshFromDb) {
        dbUser = await findUserById(userIdCandidate);
      }

      if (authUser) {
        sessionToken.userId = userIdCandidate;
      }

      // Google OAuth users arrive with user.id = Google sub (not a DB UUID).
      // If the ID lookup missed, fall back to email so the role comes from Neon.
      if (!dbUser) {
        const emailLookup =
          typeof authUser?.email === "string"
            ? authUser.email
            : typeof sessionToken.email === "string"
              ? sessionToken.email
              : null;
        if (emailLookup) {
          dbUser = await findUserByEmail(emailLookup);
          if (dbUser) {
            sessionToken.userId = dbUser.id;
          }
        }
      }

      if (dbUser) {
        sessionToken.role = resolveTokenRole(dbUser.role);
        sessionToken.userId = dbUser.id;
        sessionToken.professionalId = dbUser.professionalId ?? null;
        sessionToken.patientId = dbUser.patientId ?? null;
        sessionToken.passwordChangedAt = dbUser.passwordChangedAt ? dbUser.passwordChangedAt.toISOString() : null;
        sessionToken.defaultDashboardPath = getDefaultDashboardPath(dbUser.role);
      } else if (authUser) {
        sessionToken.role = resolveTokenRole(authUser.role);
        sessionToken.professionalId = authUser.professionalId ?? sessionToken.professionalId;
        sessionToken.patientId = authUser.patientId ?? sessionToken.patientId;
        sessionToken.passwordChangedAt =
          authUser.passwordChangedAt instanceof Date ? authUser.passwordChangedAt.toISOString() : sessionToken.passwordChangedAt;
        sessionToken.defaultDashboardPath = authUser.defaultDashboardPath ?? sessionToken.defaultDashboardPath;
      }

      if (!sessionToken.userId && sessionToken.sub) sessionToken.userId = sessionToken.sub;

      const rawRole = sessionToken.role;
      sessionToken.role = resolveTokenRole(sessionToken.role);
      if (rawRole !== sessionToken.role && !dbUser && !authUser) {
        sessionToken.invalidated = true;
        return sessionToken;
      }

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
        session.user = undefined as unknown as typeof session.user;
        return session;
      }

      const userId = typeof sessionToken.userId === "string" ? sessionToken.userId : typeof sessionToken.sub === "string" ? sessionToken.sub : "";

      if (!session.user) {
        session.user = {
          id: userId,
          email: "",
          emailVerified: null,
          name: null,
          image: null,
          role: "PACIENTE",
        };
      }

      session.user.id = userId;
      session.user.role = resolveTokenRole(sessionToken.role);
      session.user.professionalId = sessionToken.professionalId ?? null;
      session.user.patientId = sessionToken.patientId ?? null;
      if (sessionToken.defaultDashboardPath) {
        session.user.defaultDashboardPath = sessionToken.defaultDashboardPath;
      }
      return session;
    },
  },
  pages: { signIn: "/auth/login", error: "/auth/login" },
} satisfies NextAuthConfig;
