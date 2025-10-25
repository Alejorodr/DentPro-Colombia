import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import { getJwtSecretKey } from "@/lib/auth/jwt";

export async function GET() {
  const tokenCookie = (await cookies()).get("auth_token");
  const token = tokenCookie?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Invalid auth token", error);
    return NextResponse.json({ authenticated: false });
  }
}
