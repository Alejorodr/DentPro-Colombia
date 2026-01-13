import { createRequire } from "node:module";
import process from "node:process";

if (!process.env.DATABASE_URL) {
  console.log("smoke-admin-analytics: skipped (DATABASE_URL not set)");
  process.exit(0);
}

const require = createRequire(import.meta.url);
require("ts-node/register");

const { getAdminKpis, parseRange } = require("../app/portal/admin/_data/analytics.ts");

const range = parseRange({ range: "last7" });

getAdminKpis({ from: range.from, to: range.to })
  .then((kpis) => {
    console.log("smoke-admin-analytics: KPIs for last 7 days");
    console.log(kpis);
  })
  .catch((error) => {
    console.error("smoke-admin-analytics: failed", error);
    process.exitCode = 1;
  });
