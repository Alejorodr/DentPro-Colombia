import { NextResponse } from "next/server";
import { SignJWT } from "jose";

import { getJwtSecretKey } from "@/lib/auth/jwt";
import { authenticateUser, type DatabaseUser } from "@/lib/auth/users";

function buildJwtPayload(user: DatabaseUser) {
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: unknown; password?: unknown }
      | null;

    const email = typeof body?.email === "string" ? body.email : null;
    const password = typeof body?.password === "string" ? body.password : null;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "INVALID_REQUEST" },
        { status: 400 },
      );
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    const payload = buildJwtPayload(user);

    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(getJwtSecretKey());

    const response = NextResponse.json({ ok: true, user: payload });
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error during login", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
