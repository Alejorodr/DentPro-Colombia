import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { getDefaultDashboardPath, isUserRole, roleFromSlug } from "@/lib/auth/roles";

function resolveRole(token: { role?: string } | null): string | null {
  const roleCandidate = token?.role ?? "";
  return isUserRole(roleCandidate) ? roleCandidate : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.AUTH_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  const token = await getToken({ req: request, secret });
  const role = resolveRole(token);
  const isLoginRoute = pathname === "/auth/login";
  const isPortalRoute = pathname.startsWith("/portal");

  if (isLoginRoute && role) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultDashboardPath(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!isPortalRoute) {
    return NextResponse.next();
  }

  if (!role) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[1] ?? "";
  const requestedRole = slug ? roleFromSlug(slug) : null;

  if (!requestedRole) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultDashboardPath(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (requestedRole !== role) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getDefaultDashboardPath(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/auth/login"],
};
