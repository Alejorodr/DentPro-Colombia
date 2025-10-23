import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const encoder = new TextEncoder();

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is not configured");
  }

  return encoder.encode(secret);
}

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
