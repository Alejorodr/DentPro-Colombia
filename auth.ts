import NextAuth from "next-auth";
import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { cookies } from "next/headers";

import { getJwtSecretString } from "@/lib/auth/jwt";
import {
  getInferredAuthBaseUrl,
  getTrustHostSetting,
  isProductionRuntime,
  shouldUseSecureCookies,
} from "@/lib/auth/runtime";
import { isUserRole } from "@/lib/auth/roles";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { findUserById } from "@/lib/auth/users";
type AuthenticatedUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: import("@/lib/auth/roles").UserRole;
  professionalId?: string | null;
  patientId?: string | null;
  defaultDashboardPath?: string;
  passwordChangedAt?: Date | null;
};
export type AuthSession = { user?: AuthenticatedUser | null } | null;
type SessionToken = JWT & {
  userId?: string;
  role?: import("@/lib/auth/roles").UserRole;
  professionalId?: string | null;
  patientId?: string | null;
  defaultDashboardPath?: string;
  passwordChangedAt?: string | null;
  invalidated?: boolean;
};

const inferredBaseUrl = getInferredAuthBaseUrl();
const usesSecureCookies = shouldUseSecureCookies(inferredBaseUrl);
const trustHost = getTrustHostSetting();

if (isProductionRuntime() && !inferredBaseUrl) {
  console.warn("[auth] Missing NEXTAUTH_URL or VERCEL_URL; check production auth configuration.");
}

export const authOptions = {
  secret: getJwtSecretString(),
  useSecureCookies: usesSecureCookies,
  ...(trustHost ? { trustHost } : {}),
  cookies: {
    sessionToken: {
      name: usesSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: { sameSite: "strict" },
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
        return authorizeCredentials(credentials);
      },
    }),
  ],
  callbacks: {
    redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
    async jwt({ token, user }: { token: SessionToken; user?: AuthenticatedUser | null }) {
      let dbUser: Awaited<ReturnType<typeof findUserById>> | null = null;
      if (user) {
        const roleCandidate =
          typeof (user as { role?: unknown }).role === "string" ? (user as { role: string }).role : "";
        const resolvedRole = isUserRole(roleCandidate) ? roleCandidate : "PACIENTE";
        const userIdCandidate =
          typeof (user as { id?: unknown }).id === "string" ? (user as { id: string }).id : undefined;

        token.role = resolvedRole;
        token.userId = userIdCandidate ?? token.userId ?? token.sub ?? "";
        token.professionalId = (user as { professionalId?: string | null }).professionalId ?? token.professionalId;
        token.patientId = (user as { patientId?: string | null }).patientId ?? token.patientId;
        token.passwordChangedAt =
          user.passwordChangedAt instanceof Date ? user.passwordChangedAt.toISOString() : token.passwordChangedAt;

        const defaultPathCandidate =
          typeof (user as { defaultDashboardPath?: unknown }).defaultDashboardPath === "string"
            ? (user as { defaultDashboardPath: string }).defaultDashboardPath
            : undefined;

        token.defaultDashboardPath = defaultPathCandidate ?? token.defaultDashboardPath;
      } else if (token.sub && !token.role) {
        dbUser = await findUserById(token.sub);
        if (dbUser) {
          token.role = dbUser.role;
          token.professionalId = dbUser.professionalId ?? null;
          token.patientId = dbUser.patientId ?? null;
          token.passwordChangedAt = dbUser.passwordChangedAt ? dbUser.passwordChangedAt.toISOString() : null;
        }
      }

      if (!token.userId && token.sub) {
        token.userId = token.sub;
      }
      if (!token.role) {
        token.role = "PACIENTE";
      }

      const tokenIssuedAt = typeof token.iat === "number" ? token.iat * 1000 : null;
      if (token.sub) {
        if (!dbUser) {
          dbUser = await findUserById(token.sub);
        }
        if (dbUser?.passwordChangedAt && tokenIssuedAt) {
          token.invalidated = tokenIssuedAt < dbUser.passwordChangedAt.getTime();
        } else {
          token.invalidated = false;
        }
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: { user?: AuthenticatedUser | null } & Record<string, unknown>;
      token: SessionToken;
    }) {
      if (token.invalidated) {
        return null;
      }

      const role = token.role ?? "";
      const resolvedRole = isUserRole(role) ? role : "PACIENTE";
      const userId =
        typeof token.userId === "string"
          ? token.userId
          : typeof token.sub === "string"
            ? token.sub
            : "";
      session.user = {
        id: userId,
        name: session.user?.name ?? null,
        email: session.user?.email ?? null,
        image: session.user?.image ?? null,
        role: resolvedRole,
        professionalId: token.professionalId ?? null,
        patientId: token.patientId ?? null,
      };

      if (token.defaultDashboardPath && typeof token.defaultDashboardPath === "string") {
        (session.user as { defaultDashboardPath?: string }).defaultDashboardPath =
          token.defaultDashboardPath;
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};

// The NextAuth typings are not compatible with `moduleResolution: "bundler"` here, so we cast
// the default export to a callable handler to keep the route signature type-safe for Next.js.
const handler = (NextAuth as unknown as (options: typeof authOptions) => any)(authOptions);

export async function auth(): Promise<AuthSession> {
  const session = (await getServerSession(authOptions as any)) as AuthSession;
  if (session?.user) {
    return session;
  }

  const baseUrl = inferredBaseUrl;
  const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");
  const allowTestSession =
    process.env.NODE_ENV !== "production" && isLocalhost && process.env.TEST_AUTH_BYPASS === "1";
  if (!allowTestSession) {
    return session;
  }

  const cookieStore = await cookies();
  const testRole = cookieStore.get("dentpro-test-role")?.value ?? "";
  if (!isUserRole(testRole)) {
    return session;
  }

  return {
    user: {
      id: "test-user",
      name: "QA Admin",
      email: "admin@dentpro.test",
      image: null,
      role: testRole,
      professionalId: null,
      patientId: null,
    },
  } satisfies AuthSession;
}

export { handler as GET, handler as POST };
