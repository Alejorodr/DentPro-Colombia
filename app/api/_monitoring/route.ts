import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

function hasMonitoringTestAccess(request: Request) {
  const expectedToken = process.env.MONITORING_TEST_TOKEN?.trim();
  const suppliedToken = request.headers.get("x-monitoring-test-token")?.trim();
  return Boolean(expectedToken && suppliedToken && suppliedToken === expectedToken);
}

export async function GET(request: Request) {
  if (!hasMonitoringTestAccess(request)) {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  if (searchParams.get("error") === "1") {
    const error = new Error("Monitoring test error");
    Sentry.captureException(error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
