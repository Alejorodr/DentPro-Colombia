## 2024-05-22 - Global Query Limits and Analytics
**Learning:** The codebase has a global Prisma extension that imposes a `take: 50` limit on all `findMany` queries. This causes silent correctness bugs in analytics and dashboards as the clinic grows beyond 50 records.
**Action:** Always specify an explicit `take` limit in analytics queries, or use `groupBy`/`count` which are not affected by the same global `findMany` limit.
