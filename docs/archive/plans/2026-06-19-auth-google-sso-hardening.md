# Auth Security Hardening + Google SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing NextAuth setup by enforcing `User.active` across all providers, removing the email account-linking vulnerability, and completing secure Google SSO with Neon-authoritative roles.

**Architecture:** Changes are layered bottom-up: data layer (`users.ts` adds `active`), guard layer (new `google-signin-guard.ts` is a pure testable function), callback layer (`auth.config.ts` wires the guard and fixes session/jwt), infrastructure layer (`middleware.ts` rate-limits auth routes). Each layer has its own test cycle and can be reviewed independently.

**Tech Stack:** Next.js 16 App Router, NextAuth, Prisma + Neon, Upstash Redis (optional), TypeScript, Vitest

## Global Constraints

- Login canonical path: `/auth/login` — do not change
- Roles: `PACIENTE`, `PROFESIONAL`, `RECEPCIONISTA`, `ADMINISTRADOR` — exact strings, no changes
- `passwordHash` must never appear in JWT, session, or logs
- `User.role` from Neon is always authoritative — never from Google profile
- Google SSO: user must exist in Neon AND `User.active === true`
- `GOOGLE_AUTO_CREATE_PATIENTS !== "true"` → reject Google for unknown emails
- Rate limiting degrades gracefully: if Upstash env vars absent, auth still works normally
- Test runner: Vitest (`npx vitest run <path>`) — not Jest
- Commit after every task

---

### Task 1: Run Prisma migration — apply `User.active` column to the database

**Files:**
- No code changes — schema already has the field (commit `ac196a2`)
- Generated: `prisma/migrations/<timestamp>_add_user_active/migration.sql`

**Interfaces:**
- Produces: `User.active boolean NOT NULL DEFAULT true` column in Neon; regenerated Prisma Client types

- [ ] **Step 1: Verify schema already has the field**

```bash
grep "active" prisma/schema.prisma
```

Expected:
```
active                       Boolean                          @default(true)
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npx prisma migrate dev --name add_user_active
```

Expected output ends with:
```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

If it fails with `column "active" of relation "User" already exists` — the column was added manually. Run:
```bash
npx prisma migrate resolve --applied <the_migration_name_printed>
npx prisma generate
```

- [ ] **Step 3: Confirm Prisma Client types include `active`**

```bash
grep -A 2 "active" node_modules/.prisma/client/index.d.ts | head -10
```

Expected: `active: boolean` appears in the User model definition.

- [ ] **Step 4: Commit the generated migration file**

```bash
git add prisma/migrations/
git commit -m "chore(prisma): migration add_user_active"
```

---

### Task 2: Extend `DatabaseUser` interface and all Prisma selects with `active`

**Files:**
- Modify: `lib/auth/users.ts`
- Create: `lib/auth/__tests__/users.test.ts`

**Interfaces:**
- Consumes: Prisma Client with `User.active: boolean` (from Task 1)
- Produces: `DatabaseUser.active: boolean` — required by Tasks 3, 4, and 5

- [ ] **Step 1: Write the failing tests**

Create `lib/auth/__tests__/users.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    user: { findUnique: mockFindUnique },
  }),
}));

vi.mock("./roles", () => ({
  isUserRole: (r: string) =>
    ["PACIENTE", "PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"].includes(r),
}));

const { findUserByEmail, findUserById, authenticateUser } = await import("../users");

beforeEach(() => {
  vi.clearAllMocks();
});

const baseDbRow = {
  id: "uuid-1",
  name: "Ana",
  email: "ana@test.com",
  role: "PACIENTE",
  active: true,
  passwordChangedAt: null,
  mfaEnabled: false,
  professional: null,
  patient: null,
};

describe("findUserByEmail", () => {
  it("returns active=true when user is active", async () => {
    mockFindUnique.mockResolvedValue(baseDbRow);
    const result = await findUserByEmail("ana@test.com");
    expect(result?.active).toBe(true);
  });

  it("returns active=false when user is inactive", async () => {
    mockFindUnique.mockResolvedValue({ ...baseDbRow, active: false });
    const result = await findUserByEmail("ana@test.com");
    expect(result?.active).toBe(false);
  });

  it("returns null when user not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await findUserByEmail("nobody@test.com")).toBeNull();
  });
});

describe("findUserById", () => {
  it("returns active field", async () => {
    mockFindUnique.mockResolvedValue(baseDbRow);
    const result = await findUserById("uuid-1");
    expect(result?.active).toBe(true);
  });
});

describe("authenticateUser", () => {
  it("returns null when passwordHash is missing", async () => {
    mockFindUnique.mockResolvedValue({ ...baseDbRow, passwordHash: null });
    expect(await authenticateUser("ana@test.com", "pass")).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify tests fail**

```bash
npx vitest run lib/auth/__tests__/users.test.ts
```

Expected: tests for `active` field FAIL because the current interface doesn't include it.

- [ ] **Step 3: Rewrite `lib/auth/users.ts` with `active` in all selects**

Replace the full file contents:

```ts
import bcrypt from "bcryptjs";
import { getPrismaClient } from "@/lib/prisma";
import { isUserRole, type UserRole } from "./roles";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  passwordChangedAt?: Date | null;
  mfaEnabled?: boolean;
  professional?: { id: string } | null;
  patient?: { id: string } | null;
};

export interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  professionalId?: string | null;
  patientId?: string | null;
  passwordChangedAt?: Date | null;
  mfaEnabled?: boolean;
}

function mapUser(user: UserRecord | null): DatabaseUser | null {
  if (!user) return null;
  if (!isUserRole(user.role)) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    professionalId: user.professional?.id ?? null,
    patientId: user.patient?.id ?? null,
    passwordChangedAt: user.passwordChangedAt ?? null,
    mfaEnabled: user.mfaEnabled ?? false,
  };
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  passwordChangedAt: true,
  mfaEnabled: true,
  professional: { select: { id: true } },
  patient: { select: { id: true } },
} as const;

export async function authenticateUser(email: string, password: string): Promise<DatabaseUser | null> {
  const normalizedEmail = email.toLowerCase();
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { ...userSelect, passwordHash: true },
  });
  if (!user || !user.passwordHash) return null;
  const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordsMatch) return null;
  const { passwordHash: _ph, ...safeUser } = user;
  return mapUser(safeUser as UserRecord);
}

export async function findUserById(id: string): Promise<DatabaseUser | null> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  return mapUser(user as UserRecord | null);
}

export async function findUserByEmail(email: string): Promise<DatabaseUser | null> {
  const normalizedEmail = email.toLowerCase();
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: userSelect });
  return mapUser(user as UserRecord | null);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run lib/auth/__tests__/users.test.ts
```

Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/users.ts lib/auth/__tests__/users.test.ts
git commit -m "feat(auth): add active field to DatabaseUser interface and Prisma selects"
```

---

### Task 3: Block inactive users in Credentials flow

**Files:**
- Modify: `lib/auth/credentials.ts`
- Create: `lib/auth/__tests__/credentials.test.ts`

**Interfaces:**
- Consumes: `DatabaseUser.active: boolean` from Task 2; `authenticateUser` and `findUserByEmail` from `lib/auth/users.ts`
- Produces: `authorizeCredentials()` returns `null` when `user.active === false`; error message is generic (does not reveal account status)

- [ ] **Step 1: Write the failing tests**

Create `lib/auth/__tests__/credentials.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuthenticateUser = vi.fn();
const mockFindUserByEmail = vi.fn();
const mockLogger = { warn: vi.fn(), info: vi.fn() };

vi.mock("../users", () => ({
  authenticateUser: mockAuthenticateUser,
  findUserByEmail: mockFindUserByEmail,
}));
vi.mock("@/lib/logger", () => ({ logger: mockLogger }));
vi.mock("../roles", () => ({
  isUserRole: (r: string) =>
    ["PACIENTE", "PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"].includes(r),
  getDefaultDashboardPath: (role: string) => `/portal/${role.toLowerCase()}`,
}));

const { authorizeCredentials } = await import("../credentials");

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

const activeUser = {
  id: "uuid-1",
  name: "Ana",
  email: "ana@dentpro.test",
  role: "PACIENTE" as const,
  active: true,
  professionalId: null,
  patientId: null,
  passwordChangedAt: null,
};

describe("authorizeCredentials", () => {
  it("returns null when email is empty", async () => {
    expect(await authorizeCredentials({ email: "", password: "pass" })).toBeNull();
  });

  it("returns null when password is empty", async () => {
    expect(await authorizeCredentials({ email: "a@b.com", password: "" })).toBeNull();
  });

  it("returns null when authenticateUser returns null", async () => {
    mockAuthenticateUser.mockResolvedValue(null);
    expect(await authorizeCredentials({ email: "a@b.com", password: "pass" })).toBeNull();
  });

  it("returns null when user.active is false", async () => {
    mockAuthenticateUser.mockResolvedValue({ ...activeUser, active: false });
    const result = await authorizeCredentials({ email: "ana@dentpro.test", password: "pass" });
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "auth.credentials.account_inactive" }),
    );
  });

  it("returns user object when active and credentials valid", async () => {
    mockAuthenticateUser.mockResolvedValue(activeUser);
    const result = await authorizeCredentials({ email: "ana@dentpro.test", password: "pass" });
    expect(result).toMatchObject({ id: "uuid-1", role: "PACIENTE" });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
```

- [ ] **Step 2: Run — verify the `active=false` test fails**

```bash
npx vitest run lib/auth/__tests__/credentials.test.ts
```

Expected: the `active=false → null` test FAILS; the others may pass.

- [ ] **Step 3: Add `active` check to `lib/auth/credentials.ts`**

Locate the block after `const user = await authenticateUser(email, password)` and replace:

```ts
// BEFORE (find and replace this block):
  const user = await authenticateUser(email, password);
  if (!user) {
    logger.warn({ event: "auth.credentials.invalid" });
    return null;
  }

  logger.info({ event: "auth.credentials.success", userId: user.id, role: user.role });

// AFTER:
  const user = await authenticateUser(email, password);
  if (!user) {
    logger.warn({ event: "auth.credentials.invalid" });
    return null;
  }

  if (!user.active) {
    logger.warn({ event: "auth.credentials.account_inactive", userId: user.id });
    return null;
  }

  logger.info({ event: "auth.credentials.success", userId: user.id, role: user.role });
```

Also add the same check in the bypass branch (after `findUserByEmail` returns `persistedUser`). Find the block:

```ts
      if (persistedUser) {
        logger.info({ event: "auth.credentials.bypass_success", role: persistedUser.role, userId: persistedUser.id });
        return {
```

Replace with:

```ts
      if (persistedUser) {
        if (!persistedUser.active) {
          logger.warn({ event: "auth.credentials.account_inactive", userId: persistedUser.id });
          return null;
        }
        logger.info({ event: "auth.credentials.bypass_success", role: persistedUser.role, userId: persistedUser.id });
        return {
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npx vitest run lib/auth/__tests__/credentials.test.ts
```

Expected: 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/credentials.ts lib/auth/__tests__/credentials.test.ts
git commit -m "feat(auth): block inactive users in credentials flow"
```

---

### Task 4: Create pure, testable Google sign-in guard

**Files:**
- Create: `lib/auth/google-signin-guard.ts`
- Create: `lib/auth/__tests__/google-signin-guard.test.ts`

**Interfaces:**
- Consumes: `DatabaseUser` type from `lib/auth/users.ts`
- Produces: `validateGoogleSignIn(profile, findUser, autoCreate): Promise<boolean>` — consumed verbatim by Task 5

- [ ] **Step 1: Write the failing tests**

Create `lib/auth/__tests__/google-signin-guard.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { validateGoogleSignIn } from "../google-signin-guard";
import type { DatabaseUser } from "../users";

const activeUser: DatabaseUser = {
  id: "uuid-1",
  name: "Ana",
  email: "ana@gmail.com",
  role: "PACIENTE",
  active: true,
  professionalId: null,
  patientId: null,
};

const inactiveUser: DatabaseUser = { ...activeUser, active: false };

describe("validateGoogleSignIn", () => {
  it("returns false when profile has no email", async () => {
    expect(
      await validateGoogleSignIn({ email_verified: true }, vi.fn(), false),
    ).toBe(false);
  });

  it("returns false when email_verified is false", async () => {
    expect(
      await validateGoogleSignIn({ email: "a@g.com", email_verified: false }, vi.fn(), false),
    ).toBe(false);
  });

  it("returns false when user not found and autoCreate disabled", async () => {
    const findUser = vi.fn().mockResolvedValue(null);
    expect(
      await validateGoogleSignIn({ email: "new@g.com", email_verified: true }, findUser, false),
    ).toBe(false);
  });

  it("returns true when user not found and autoCreate enabled", async () => {
    const findUser = vi.fn().mockResolvedValue(null);
    expect(
      await validateGoogleSignIn({ email: "new@g.com", email_verified: true }, findUser, true),
    ).toBe(true);
  });

  it("returns false when user exists but is inactive", async () => {
    const findUser = vi.fn().mockResolvedValue(inactiveUser);
    expect(
      await validateGoogleSignIn({ email: "ana@gmail.com", email_verified: true }, findUser, false),
    ).toBe(false);
  });

  it("returns true when user exists and is active", async () => {
    const findUser = vi.fn().mockResolvedValue(activeUser);
    expect(
      await validateGoogleSignIn({ email: "ana@gmail.com", email_verified: true }, findUser, false),
    ).toBe(true);
  });

  it("normalizes email to lowercase before calling findUser", async () => {
    const findUser = vi.fn().mockResolvedValue(activeUser);
    await validateGoogleSignIn({ email: "Ana@Gmail.Com", email_verified: true }, findUser, false);
    expect(findUser).toHaveBeenCalledWith("ana@gmail.com");
  });
});
```

- [ ] **Step 2: Run — verify tests fail**

```bash
npx vitest run lib/auth/__tests__/google-signin-guard.test.ts
```

Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Create `lib/auth/google-signin-guard.ts`**

```ts
import type { DatabaseUser } from "./users";

type GoogleProfile = {
  email?: string;
  email_verified?: boolean;
};

export async function validateGoogleSignIn(
  profile: GoogleProfile | undefined,
  findUser: (email: string) => Promise<DatabaseUser | null>,
  autoCreate: boolean,
): Promise<boolean> {
  const email = typeof profile?.email === "string" ? profile.email.toLowerCase() : "";
  const emailVerified = profile?.email_verified === true;

  if (!email || !emailVerified) return false;

  const existingUser = await findUser(email);

  if (!existingUser) return autoCreate;

  return existingUser.active;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run lib/auth/__tests__/google-signin-guard.test.ts
```

Expected: 7/7 PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/google-signin-guard.ts lib/auth/__tests__/google-signin-guard.test.ts
git commit -m "feat(auth): extract testable Google sign-in guard with active enforcement"
```

---

### Task 5: Wire guard into `auth.config.ts` — remove `allowDangerousEmailAccountLinking`, fix `signIn` callback

**Files:**
- Modify: `auth.config.ts`

**Interfaces:**
- Consumes: `validateGoogleSignIn` from Task 4 (exact signature: `(profile, findUser, autoCreate) => Promise<boolean>`)
- Produces: `GoogleProvider` without `allowDangerousEmailAccountLinking`; `signIn` callback delegates to guard

- [ ] **Step 1: Add import for `validateGoogleSignIn` at the top of `auth.config.ts`**

After the existing imports (after the line `import { logAuditEvent } from "@/lib/audit";`), add:

```ts
import { validateGoogleSignIn } from "@/lib/auth/google-signin-guard";
```

- [ ] **Step 2: Remove `allowDangerousEmailAccountLinking` from `GoogleProvider`**

Find:
```ts
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
```

Replace with:
```ts
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
```

- [ ] **Step 3: Replace the `signIn` callback**

Find and replace the entire `async signIn({ account, profile })` callback:

```ts
// REPLACE THE ENTIRE signIn CALLBACK:
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
```

- [ ] **Step 4: Verify TypeScript compiles without errors in these files**

```bash
npx tsc --noEmit 2>&1 | grep -E "auth\.config|google-signin"
```

Expected: no output (no errors in those files).

- [ ] **Step 5: Run all auth tests**

```bash
npx vitest run lib/auth/__tests__/
```

Expected: all tests in the directory pass.

- [ ] **Step 6: Confirm `allowDangerousEmailAccountLinking` is gone**

```bash
grep -r "allowDangerousEmailAccountLinking" . --include="*.ts" --exclude-dir=node_modules
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add auth.config.ts
git commit -m "feat(auth): wire Google guard, remove allowDangerousEmailAccountLinking"
```

---

### Task 6: Fix `session` callback (clear user when invalidated) + `jwt` callback (role safety)

**Files:**
- Modify: `auth.config.ts` (session and jwt callbacks only)

**Interfaces:**
- Consumes: `sessionToken.invalidated: boolean` (already set in the jwt callback's invalidation logic at lines ~202–205)
- Produces: invalidated sessions return session without user; tokens with unknown roles are invalidated instead of silently downgraded to PACIENTE

- [ ] **Step 1: Fix `session` callback — clear user when `invalidated`**

Find the `session` callback. Current code:
```ts
    async session({ session, token }) {
      const sessionToken = token as SessionToken;
      if (sessionToken.invalidated) {
        return session;
```

Replace only those first 4 lines of the callback (the `invalidated` early-return):
```ts
    async session({ session, token }) {
      const sessionToken = token as SessionToken;
      if (sessionToken.invalidated) {
        session.user = undefined as unknown as typeof session.user;
        return session;
```

- [ ] **Step 2: Fix `jwt` callback — invalidate on unknown role instead of defaulting**

Find these two consecutive lines near the end of the `jwt` callback (before `return sessionToken`):

```ts
      if (!sessionToken.userId && sessionToken.sub) sessionToken.userId = sessionToken.sub;
      sessionToken.role = resolveTokenRole(sessionToken.role);
```

Replace with:
```ts
      if (!sessionToken.userId && sessionToken.sub) sessionToken.userId = sessionToken.sub;

      const rawRole = sessionToken.role;
      sessionToken.role = resolveTokenRole(sessionToken.role);
      // If resolveTokenRole changed the role (unknown value → default), AND neither a fresh
      // login nor a DB record confirmed a valid role, the token is untrustworthy — invalidate.
      if (rawRole !== sessionToken.role && !dbUser && !authUser) {
        sessionToken.invalidated = true;
        return sessionToken;
      }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "auth\.config"
```

Expected: no errors.

- [ ] **Step 4: Run all auth tests**

```bash
npx vitest run lib/auth/__tests__/
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add auth.config.ts
git commit -m "fix(auth): clear user on invalidated session, guard jwt role downgrade"
```

---

### Task 7: Rate limiting middleware on auth routes

**Files:**
- Create: `middleware.ts` (project root, alongside `auth.ts` and `auth.config.ts`)
- Create: `middleware.test.ts` (project root)

**Interfaces:**
- Consumes: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars
- Produces: requests to `/api/auth/*` return 429 after 10 requests per IP per 60 seconds; if Upstash env vars absent, requests pass through normally

- [ ] **Step 1: Write the failing tests**

Create `middleware.test.ts` in the project root:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { middleware } = await import("./middleware");

function req(path: string, ip = "1.2.3.4") {
  return new NextRequest(`http://localhost${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("middleware", () => {
  it("passes non-auth routes without calling Upstash", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    const res = await middleware(req("/api/appointments"));
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("passes auth routes when Upstash is not configured", async () => {
    const res = await middleware(req("/api/auth/signin"));
    expect(res.status).toBe(200);
  });

  it("allows requests under the rate limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockResolvedValue({ json: async () => ({ result: 5 }) });
    const res = await middleware(req("/api/auth/signin"));
    expect(res.status).toBe(200);
  });

  it("returns 429 when over the rate limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockResolvedValue({ json: async () => ({ result: 11 }) });
    const res = await middleware(req("/api/auth/signin"));
    expect(res.status).toBe(429);
  });

  it("passes through when Upstash fetch throws (graceful degradation)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    mockFetch.mockRejectedValue(new Error("network error"));
    const res = await middleware(req("/api/auth/signin"));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run — verify tests fail**

```bash
npx vitest run middleware.test.ts
```

Expected: FAIL — `middleware.ts` does not exist.

- [ ] **Step 3: Create `middleware.ts` in the project root**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const key = `rl:auth:${ip}`;

  try {
    const incrRes = await fetch(`${upstashUrl}/incr/${key}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    const { result: count } = (await incrRes.json()) as { result: number };

    if (count === 1) {
      void fetch(`${upstashUrl}/expire/${key}/${RATE_LIMIT_WINDOW_SECONDS}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
    }

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return new NextResponse("Too many requests", { status: 429 });
    }
  } catch {
    // Upstash unavailable — allow through
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run middleware.test.ts
```

Expected: 5/5 PASS.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep middleware
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add middleware.ts middleware.test.ts
git commit -m "feat(auth): rate limiting middleware on auth routes via Upstash"
```

---

## Final verification

- [ ] **Full test suite:**
```bash
npx vitest run
```
Expected: all tests pass.

- [ ] **Build:**
```bash
npm run build
```
Expected: no errors.

- [ ] **Confirm `allowDangerousEmailAccountLinking` is absent:**
```bash
grep -r "allowDangerousEmailAccountLinking" . --include="*.ts" --exclude-dir=node_modules
```
Expected: no output.

- [ ] **Confirm `active` is checked everywhere:**
```bash
grep -n "active" auth.config.ts lib/auth/google-signin-guard.ts lib/auth/credentials.ts lib/auth/users.ts
```
Expected: multiple matches in each file.
