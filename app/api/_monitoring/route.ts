import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("error") === "1") {
    const error = new Error("Monitoring test error");
    Sentry.captureException(error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
