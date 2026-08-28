# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add search/filter/pagination to the admin user panel, expose active/inactive toggle, implement a secure admin-initiated password reset (temp password shown once), self-service password change, and access control guards (no self-role-change, no deleting the last ADMINISTRADOR).

**Architecture:** Extend the existing `/api/users` routes with query params and guards; add two new endpoints (`/api/users/[id]/reset-password` and `/api/users/me/change-password`); propagate a new `mustChangePassword` flag through the JWT → session → requireRole redirect chain; refactor `AdminUsersPanel` in-place with search, filters, pagination, and two new modals.

**Tech Stack:** Next.js App Router, NextAuth v5 (JWT strategy, custom `auth()` in `auth.ts`), Prisma/PostgreSQL (Neon), TypeScript, Tailwind v4, Vitest, bcryptjs, zod.

## Global Constraints

- **Never expose `passwordHash`** — always redact before any response leaves the server.
- **`auth()` from `auth.ts` is a custom function** — it decodes the JWT directly via `await cookies()` and NEVER calls `baseAuth()`. Do not change this function's core decoding flow.
- **All role values are `PACIENTE | PROFESIONAL | RECEPCIONISTA | ADMINISTRADOR`** — no other values accepted.
- **Password policy**: `PASSWORD_POLICY_REGEX` from `lib/auth/password-policy.ts` — min 8 chars, uppercase, lowercase, digit, symbol.
- **Temp password generation**: `crypto.randomBytes(12).toString("base64url")` — exactly 16 URL-safe chars.
- **`bcrypt` cost factor**: 10 (existing convention).
- **No `window.confirm` or `window.prompt`** in UI — use inline confirmation patterns or modals.
- **Pagination page size in UI**: 20 items per page (`pageSize=20`).
- **All UI text in Spanish (Colombia)**; navigation labels in English per project convention.
- **No new npm packages** — use only what is already installed (`bcryptjs`, `zod`, `node:crypto`).
- **Tests use Vitest** with `vi.mock` for `@/lib/prisma` and `@/lib/authz`; call route handlers directly (not via HTTP stack).

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `prisma/schema.prisma` | Add `mustChangePassword Boolean @default(false)` to User |
| Modify | `lib/auth/users.ts` | Add `mustChangePassword` to types and DB selects |
| Modify | `auth.config.ts` | Persist `mustChangePassword` in JWT callback |
| Modify | `auth.ts` | Expose `mustChangePassword` from decoded JWT token |
| Modify | `next-auth.d.ts` | Extend JWT type declaration |
| Modify | `lib/auth/require-role.ts` | Redirect to `/portal/change-password` if `mustChangePassword` |
| Modify | `app/api/users/route.ts` | Add search/role/active filters + `hasLocalPassword`/`_isGoogleUser` |
| Modify | `app/api/users/[id]/route.ts` | Add PATCH guards + DELETE last-admin guard |
| Create | `app/api/users/[id]/reset-password/route.ts` | Generate temp password, set `mustChangePassword=true` |
| Create | `app/api/users/me/change-password/route.ts` | Self-service password change, clears `mustChangePassword` |
| Modify | `app/portal/admin/users/AdminUsersPanel.tsx` | Search, filters, pagination, active toggle, reset modal |
| Create | `app/portal/change-password/page.tsx` | Change-password page (forced + voluntary) |

---

### Task 1: Prisma schema + `lib/auth/users.ts` — add `mustChangePassword`

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/auth/users.ts`

**Interfaces:**
- Produces: `DatabaseUser.mustChangePassword?: boolean` — used by Tasks 2 and 7.

- [ ] **Step 1: Add field to schema**

In `prisma/schema.prisma`, find the `model User` block. After the `passwordChangedAt` line, add:

```prisma
mustChangePassword           Boolean                          @default(false)
```

The full block around the change looks like:
```prisma
model User {
  id                           String                           @id @default(uuid()) @db.Uuid
  email                        String                           @unique
  passwordHash                 String?
  emailVerified                DateTime?
  image                        String?
  role                         Role
  name                         String
  lastName                     String
  active                       Boolean                          @default(true)
  privacyMode                  Boolean                          @default(false)
  mfaEnabled                   Boolean                          @default(false)
  createdAt                    DateTime                         @default(now())
  passwordChangedAt            DateTime?
  mustChangePassword           Boolean                          @default(false)
  updatedAt                    DateTime                         @updatedAt
  // ... rest unchanged
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_must_change_password
```

Expected output: `✔ Generated Prisma Client` and a new file under `prisma/migrations/`.

If on CI without a real DB, just run:
```bash
npx prisma generate
```

- [ ] **Step 3: Update `lib/auth/users.ts`**

Replace the contents of `lib/auth/users.ts` with:

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
  mustChangePassword?: boolean;
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
  mustChangePassword: boolean;
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
    mustChangePassword: user.mustChangePassword ?? false,
    professionalId: user.professional?.id ?? null,
    patientId: user.patient?.id ?? null,
    passwordChangedAt: user.passwordChangedAt ?? null,
    mfaEnabled: user.mfaEnabled ?? false,
  };
}

export async function authenticateUser(email: string, password: string): Promise<DatabaseUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      active: true,
      mustChangePassword: true,
      passwordChangedAt: true,
      mfaEnabled: true,
      professional: { select: { id: true } },
      patient: { select: { id: true } },
    },
  });

  if (!user || !user.passwordHash) return null;

  const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordsMatch) return null;

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return mapUser(safeUser as UserRecord);
}

export async function findUserById(id: string): Promise<DatabaseUser | null> {
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      mustChangePassword: true,
      passwordChangedAt: true,
      mfaEnabled: true,
      professional: { select: { id: true } },
      patient: { select: { id: true } },
    },
  });
  return mapUser(user as UserRecord | null);
}

export async function findUserByEmail(email: string): Promise<DatabaseUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      mustChangePassword: true,
      passwordChangedAt: true,
      mfaEnabled: true,
      professional: { select: { id: true } },
      patient: { select: { id: true } },
    },
  });
  return mapUser(user as UserRecord | null);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `mustChangePassword`. Fix any that appear.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ lib/auth/users.ts
git commit -m "feat(auth): add mustChangePassword to User schema and DatabaseUser type"
```

---

### Task 2: JWT/session types — propagate `mustChangePassword` through auth chain

**Files:**
- Modify: `auth.config.ts`
- Modify: `auth.ts`
- Modify: `next-auth.d.ts`

**Interfaces:**
- Consumes: `DatabaseUser.mustChangePassword` from Task 1.
- Produces: `AuthSession.user.mustChangePassword?: boolean` — used by Task 3 (`requireRole`).

- [ ] **Step 1: Extend `SessionToken` type in `auth.config.ts`**

In `auth.config.ts`, find the `type SessionToken = JWT & { ... }` declaration. Add `mustChangePassword?: boolean`:

```ts
type SessionToken = JWT & {
  userId?: string;
  role?: UserRole;
  professionalId?: string | null;
  patientId?: string | null;
  defaultDashboardPath?: string;
  passwordChangedAt?: string | null;
  invalidated?: boolean;
  mustChangePassword?: boolean;
};
```

- [ ] **Step 2: Write `mustChangePassword` into the JWT in `auth.config.ts`**

In the `jwt` callback, find the block that starts with `if (dbUser) {`. Add the `mustChangePassword` line:

```ts
if (dbUser) {
  sessionToken.role = resolveTokenRole(dbUser.role);
  sessionToken.userId = dbUser.id;
  sessionToken.professionalId = dbUser.professionalId ?? null;
  sessionToken.patientId = dbUser.patientId ?? null;
  sessionToken.passwordChangedAt = dbUser.passwordChangedAt ? dbUser.passwordChangedAt.toISOString() : null;
  sessionToken.defaultDashboardPath = getDefaultDashboardPath(dbUser.role);
  sessionToken.mustChangePassword = dbUser.mustChangePassword ?? false;
}
```

- [ ] **Step 3: Extend `AuthenticatedUser` type in `auth.ts`**

In `auth.ts`, find `type AuthenticatedUser`. Add `mustChangePassword`:

```ts
type AuthenticatedUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: UserRole;
  professionalId?: string | null;
  patientId?: string | null;
  mustChangePassword?: boolean;
};
```

- [ ] **Step 4: Read `mustChangePassword` from decoded token in `auth.ts`**

In `auth.ts`, inside the `auth()` function, find the `return { user: { ... } }` inside the `if (userId && isUserRole(role))` block. Add `mustChangePassword`:

```ts
return {
  user: {
    id: userId,
    name: (token["name"] as string | null) ?? null,
    email: (token["email"] as string | null) ?? null,
    image: (token["picture"] as string | null) ?? null,
    role: role as UserRole,
    professionalId: (token["professionalId"] as string | null) ?? null,
    patientId: (token["patientId"] as string | null) ?? null,
    mustChangePassword: (token["mustChangePassword"] as boolean | null) ?? false,
  },
};
```

- [ ] **Step 5: Extend JWT type in `next-auth.d.ts`**

In `next-auth.d.ts`, add `mustChangePassword` to the JWT interface:

```ts
declare module "next-auth/jwt" {
  interface JWT {
    role?: import("./lib/auth/roles").UserRole;
    mustChangePassword?: boolean;
  }
}
```

- [ ] **Step 6: Write the failing test**

Create file `lib/auth/__tests__/must-change-password.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const { findUserByIdMock } = vi.hoisted(() => ({
  findUserByIdMock: vi.fn(),
}));

vi.mock("@/lib/auth/users", () => ({
  findUserById: findUserByIdMock,
  findUserByEmail: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/lib/auth/google-signin-guard", () => ({ validateGoogleSignIn: vi.fn().mockResolvedValue(true) }));

describe("jwt callback persists mustChangePassword", () => {
  it("sets mustChangePassword=true in token when db user has it set", async () => {
    findUserByIdMock.mockResolvedValue({
      id: "user-1",
      role: "PACIENTE",
      active: true,
      mustChangePassword: true,
      professionalId: null,
      patientId: null,
      passwordChangedAt: null,
    });

    // Import the config AFTER mocks are set up
    const { authConfig } = await import("@/auth.config");
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwt callback missing");

    const token = await jwtCallback({
      token: { sub: "user-1", iat: Math.floor(Date.now() / 1000) },
      user: { id: "user-1", email: "test@test.com", role: "PACIENTE" as const },
      account: null,
      trigger: "signIn",
    } as Parameters<typeof jwtCallback>[0]);

    expect((token as { mustChangePassword?: boolean }).mustChangePassword).toBe(true);
  });

  it("sets mustChangePassword=false when db user does not have it set", async () => {
    findUserByIdMock.mockResolvedValue({
      id: "user-2",
      role: "PACIENTE",
      active: true,
      mustChangePassword: false,
      professionalId: null,
      patientId: null,
      passwordChangedAt: null,
    });

    const { authConfig } = await import("@/auth.config");
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) throw new Error("jwt callback missing");

    const token = await jwtCallback({
      token: { sub: "user-2", iat: Math.floor(Date.now() / 1000) },
      user: { id: "user-2", email: "other@test.com", role: "PACIENTE" as const },
      account: null,
      trigger: "signIn",
    } as Parameters<typeof jwtCallback>[0]);

    expect((token as { mustChangePassword?: boolean }).mustChangePassword).toBe(false);
  });
});
```

- [ ] **Step 7: Run the failing test**

```bash
npx vitest run lib/auth/__tests__/must-change-password.test.ts
```

Expected: tests pass after implementing Steps 1-5 above (if they fail, fix the implementation).

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add auth.config.ts auth.ts next-auth.d.ts lib/auth/__tests__/must-change-password.test.ts
git commit -m "feat(auth): propagate mustChangePassword through JWT and session"
```

---

### Task 3: `requireRole` — redirect to `/portal/change-password` if `mustChangePassword`

**Files:**
- Modify: `lib/auth/require-role.ts`

**Interfaces:**
- Consumes: `AuthSession.user.mustChangePassword` from Task 2.
- Produces: Server-side redirect to `/portal/change-password` for any portal page when flag is true.

- [ ] **Step 1: Write the failing test**

Create `lib/auth/__tests__/require-role.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn(() => { throw new Error("REDIRECT"); }),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/auth/roles", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/roles")>();
  return actual;
});

describe("requireRole", () => {
  it("redirects to /portal/change-password when mustChangePassword is true", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", role: "ADMINISTRADOR", mustChangePassword: true },
    });

    const { requireRole } = await import("@/lib/auth/require-role");

    await expect(requireRole("ADMINISTRADOR")).rejects.toThrow("REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/portal/change-password");
  });

  it("does NOT redirect when mustChangePassword is false", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", role: "ADMINISTRADOR", mustChangePassword: false },
    });
    redirectMock.mockReset();

    const { requireRole } = await import("@/lib/auth/require-role");

    const result = await requireRole("ADMINISTRADOR");
    expect(result).toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalledWith("/portal/change-password");
  });

  it("redirects to /auth/login when not authenticated", async () => {
    authMock.mockResolvedValue(null);

    const { requireRole } = await import("@/lib/auth/require-role");

    await expect(requireRole("ADMINISTRADOR")).rejects.toThrow("REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/auth/login");
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npx vitest run lib/auth/__tests__/require-role.test.ts
```

Expected: the `mustChangePassword` test fails.

- [ ] **Step 3: Update `lib/auth/require-role.ts`**

Replace the full file content:

```ts
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultDashboardPath, isUserRole, type UserRole } from "@/lib/auth/roles";

export async function requireRole(allowedRoles: UserRole | UserRole[]) {
  const session = await auth();
  const role = session?.user?.role;
  const normalizedRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!role || !isUserRole(role)) {
    redirect("/auth/login");
  }

  if (session?.user?.mustChangePassword) {
    redirect("/portal/change-password");
  }

  if (!normalizedRoles.includes(role)) {
    redirect(getDefaultDashboardPath(role));
  }

  return session;
}
```

- [ ] **Step 4: Run the tests again**

```bash
npx vitest run lib/auth/__tests__/require-role.test.ts
```

Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/require-role.ts lib/auth/__tests__/require-role.test.ts
git commit -m "feat(auth): redirect to change-password page when mustChangePassword is set"
```

---

### Task 4: `GET /api/users` — search, filter, computed fields

**Files:**
- Modify: `app/api/users/route.ts`
- Test: `app/api/users/__tests__/get-users.test.ts`

**Interfaces:**
- Produces: `{ data: UserRecord[], items: UserRecord[], page, pageSize, total, totalPages }` where `UserRecord` now includes `hasLocalPassword: boolean` and `_isGoogleUser: boolean`.

- [ ] **Step 1: Write the failing tests**

Create `app/api/users/__tests__/get-users.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/users/route";

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => prismaMock,
}));

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/app/api/_utils/observability", () => ({ logApiError: vi.fn() }));

const ADMIN_SESSION = { user: { id: "admin-id", role: "ADMINISTRADOR" as const } };

function makeUser(overrides: Partial<{
  id: string; name: string; lastName: string; email: string;
  role: string; active: boolean; passwordHash: string | null;
  accounts: { provider: string }[];
}> = {}) {
  return {
    id: randomUUID(),
    name: "Test",
    lastName: "User",
    email: `test-${randomUUID()}@example.com`,
    role: "PACIENTE",
    active: true,
    passwordHash: "hash",
    createdAt: new Date(),
    accounts: [],
    patient: null,
    professional: null,
    ...overrides,
  };
}

describe("GET /api/users", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.user.findMany.mockResolvedValue([]);
  });

  it("returns 401 when not authenticated", async () => {
    requireSessionMock.mockResolvedValue({ error: { message: "No autorizado.", status: 401 } });
    const req = new Request("http://localhost/api/users");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not ADMINISTRADOR", async () => {
    requireSessionMock.mockResolvedValue({ user: { id: "u", role: "PACIENTE" } });
    requireRoleMock.mockReturnValue({ status: 403, message: "No autorizado." });
    const req = new Request("http://localhost/api/users");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("computes hasLocalPassword=true when passwordHash is non-null", async () => {
    const user = makeUser({ passwordHash: "bcrypt-hash", accounts: [] });
    prismaMock.user.findMany.mockResolvedValue([user]);
    prismaMock.user.count.mockResolvedValue(1);

    const res = await GET(new Request("http://localhost/api/users"));
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { hasLocalPassword: boolean }[] };
    expect(body.data[0].hasLocalPassword).toBe(true);
  });

  it("computes hasLocalPassword=false when passwordHash is null", async () => {
    const user = makeUser({ passwordHash: null, accounts: [{ provider: "google" }] });
    prismaMock.user.findMany.mockResolvedValue([user]);
    prismaMock.user.count.mockResolvedValue(1);

    const res = await GET(new Request("http://localhost/api/users"));
    const body = await res.json() as { data: { hasLocalPassword: boolean; _isGoogleUser: boolean }[] };
    expect(body.data[0].hasLocalPassword).toBe(false);
    expect(body.data[0]._isGoogleUser).toBe(true);
  });

  it("passes search param to prisma where clause", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);

    await GET(new Request("http://localhost/api/users?search=ana"));

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
  });

  it("passes role param to prisma where clause", async () => {
    await GET(new Request("http://localhost/api/users?role=PROFESIONAL"));
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role: "PROFESIONAL" }) }),
    );
  });

  it("passes active=false param to prisma where clause", async () => {
    await GET(new Request("http://localhost/api/users?active=false"));
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ active: false }) }),
    );
  });

  it("does not include passwordHash in the response", async () => {
    prismaMock.user.findMany.mockResolvedValue([makeUser()]);
    prismaMock.user.count.mockResolvedValue(1);
    const res = await GET(new Request("http://localhost/api/users"));
    const body = await res.json() as { data: Record<string, unknown>[] };
    expect(body.data[0].passwordHash).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
npx vitest run app/api/users/__tests__/get-users.test.ts
```

Expected: search/filter tests fail.

- [ ] **Step 3: Rewrite `GET` handler in `app/api/users/route.ts`**

Replace the `GET` export with:

```ts
export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para listar usuarios.", roleError.status);
  }

  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const search = searchParams.get("search")?.trim() || undefined;
  const roleParam = searchParams.get("role")?.trim() || undefined;
  const activeParam = searchParams.get("active");

  const isUserRoleValue = (v: string): v is import("@prisma/client").Role =>
    ["PACIENTE", "PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"].includes(v);

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(roleParam && isUserRoleValue(roleParam) ? { role: roleParam } : {}),
    ...(activeParam === "true" ? { active: true } : activeParam === "false" ? { active: false } : {}),
  };

  try {
    const prisma = getPrismaClient();
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          patient: true,
          professional: { include: { specialty: true } },
          accounts: { select: { provider: true } },
        },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    const mapped = users.map(({ passwordHash, accounts, ...user }) => ({
      ...user,
      hasLocalPassword: passwordHash !== null,
      _isGoogleUser: accounts.some((a) => a.provider === "google"),
    }));

    return NextResponse.json(buildPaginatedResponse(mapped, page, pageSize, total));
  } catch (error) {
    logApiError(
      {
        event: "admin.users.list_failed",
        route: "/api/users",
        userId: sessionResult.user.id,
      },
      error,
    );
    return internalServerErrorResponse("No se pudo listar usuarios.");
  }
}
```

Note: `passwordHash` is destructured out and never included in the response. `redactSensitiveAuthFields` is no longer needed on the list response since we manually exclude sensitive fields.

- [ ] **Step 4: Run the tests**

```bash
npx vitest run app/api/users/__tests__/get-users.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/api/users/route.ts app/api/users/__tests__/get-users.test.ts
git commit -m "feat(api): add search/filter/pagination and computed fields to GET /api/users"
```

---

### Task 5: `PATCH /api/users/[id]` — access control guards

**Files:**
- Modify: `app/api/users/[id]/route.ts` (PATCH handler only)
- Test: `app/api/users/[id]/__tests__/patch-guards.test.ts`

**Interfaces:**
- Consumes: existing `PATCH` handler structure.
- Produces: 403 on self-role-change, 403 on self-deactivate, 400 when trying to demote/deactivate the last active ADMINISTRADOR.

- [ ] **Step 1: Write the failing tests**

Create `app/api/users/[id]/__tests__/patch-guards.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/users/[id]/route";

const ADMIN_ID = randomUUID();
const OTHER_USER_ID = randomUUID();

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    patientProfile: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    professionalProfile: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/security/redaction", () => ({ redactSensitiveAuthFields: (v: unknown) => v }));

const ADMIN_SESSION = { user: { id: ADMIN_ID, role: "ADMINISTRADOR" as const } };

function makeExisting(overrides: Record<string, unknown> = {}) {
  return {
    id: OTHER_USER_ID,
    role: "PACIENTE",
    active: true,
    patient: null,
    professional: null,
    ...overrides,
  };
}

async function callPatch(targetId: string, body: Record<string, unknown>) {
  return PATCH(
    new Request(`http://localhost/api/users/${targetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: targetId }) },
  );
}

describe("PATCH /api/users/[id] guards", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.user.update.mockResolvedValue({ id: OTHER_USER_ID, role: "PACIENTE", active: true });
  });

  it("rejects self-role-change with 403", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ id: ADMIN_ID, role: "ADMINISTRADOR" }));
    const res = await callPatch(ADMIN_ID, { role: "PACIENTE" });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/propio rol/);
  });

  it("rejects self-deactivation with 403", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ id: ADMIN_ID, role: "ADMINISTRADOR" }));
    const res = await callPatch(ADMIN_ID, { active: false });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/desactivarte/);
  });

  it("rejects demoting the last ADMINISTRADOR with 400", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ role: "ADMINISTRADOR" }));
    prismaMock.user.count.mockResolvedValue(0);
    const res = await callPatch(OTHER_USER_ID, { role: "PACIENTE" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/único administrador/);
  });

  it("rejects deactivating the last ADMINISTRADOR with 400", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ role: "ADMINISTRADOR" }));
    prismaMock.user.count.mockResolvedValue(0);
    const res = await callPatch(OTHER_USER_ID, { active: false });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/único administrador/);
  });

  it("allows demoting an ADMINISTRADOR when others exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ role: "ADMINISTRADOR" }));
    prismaMock.user.count.mockResolvedValue(1);
    const res = await callPatch(OTHER_USER_ID, { role: "RECEPCIONISTA" });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the failing tests**

```bash
npx vitest run "app/api/users/[id]/__tests__/patch-guards.test.ts"
```

Expected: guard tests fail.

- [ ] **Step 3: Add guards to the PATCH handler in `app/api/users/[id]/route.ts`**

In the `PATCH` function, after the block that fetches `existing` (`const existing = await prisma.user.findUnique(...)`) and before the password hash line, insert:

```ts
  // Guard: no self-role-change
  if (id === sessionResult.user.id && payload.role && payload.role !== existing.role) {
    return errorResponse("No puedes cambiar tu propio rol.", 403);
  }

  // Guard: no self-deactivation
  if (id === sessionResult.user.id && payload.active === false) {
    return errorResponse("No puedes desactivarte a ti mismo.", 403);
  }

  // Guard: no demoting or deactivating the last active ADMINISTRADOR
  if (existing.role === "ADMINISTRADOR") {
    const isDemoting = payload.role !== undefined && payload.role !== "ADMINISTRADOR";
    const isDeactivating = payload.active === false;
    if (isDemoting || isDeactivating) {
      const otherActiveAdminCount = await prisma.user.count({
        where: { role: "ADMINISTRADOR", active: true, id: { not: id } },
      });
      if (otherActiveAdminCount === 0) {
        return errorResponse("No puedes degradar o desactivar al único administrador activo.", 400);
      }
    }
  }
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run "app/api/users/[id]/__tests__/patch-guards.test.ts"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/api/users/[id]/route.ts" "app/api/users/[id]/__tests__/patch-guards.test.ts"
git commit -m "feat(api): add self-role-change and last-admin guards to PATCH /api/users/[id]"
```

---

### Task 6: `DELETE /api/users/[id]` — last-admin guard

**Files:**
- Modify: `app/api/users/[id]/route.ts` (DELETE handler only)
- Test: `app/api/users/[id]/__tests__/delete-guard.test.ts`

**Interfaces:**
- Produces: 400 when trying to delete the last active ADMINISTRADOR.

- [ ] **Step 1: Write the failing test**

Create `app/api/users/[id]/__tests__/delete-guard.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DELETE } from "@/app/api/users/[id]/route";

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));

const ADMIN_SESSION = { user: { id: randomUUID(), role: "ADMINISTRADOR" as const } };

async function callDelete(targetId: string) {
  return DELETE(
    new Request(`http://localhost/api/users/${targetId}`, { method: "DELETE" }),
    { params: Promise.resolve({ id: targetId }) },
  );
}

describe("DELETE /api/users/[id] guard", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await callDelete(randomUUID());
    expect(res.status).toBe(404);
  });

  it("returns 400 when deleting the last active ADMINISTRADOR", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "ADMINISTRADOR", active: true });
    prismaMock.user.count.mockResolvedValue(0);
    const res = await callDelete(id);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/único administrador/);
  });

  it("allows deleting an ADMINISTRADOR when others exist", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "ADMINISTRADOR", active: true });
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.delete.mockResolvedValue({ id });
    const res = await callDelete(id);
    expect(res.status).toBe(200);
  });

  it("allows deleting a non-admin user", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, role: "PACIENTE", active: true });
    prismaMock.user.delete.mockResolvedValue({ id });
    const res = await callDelete(id);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the failing tests**

```bash
npx vitest run "app/api/users/[id]/__tests__/delete-guard.test.ts"
```

Expected: guard tests fail (and 404 test may fail since existing DELETE doesn't fetch before deleting).

- [ ] **Step 3: Update `DELETE` handler in `app/api/users/[id]/route.ts`**

Replace the `DELETE` export with:

```ts
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { id } = await params;
  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para eliminar usuarios.", 403);
  }

  const prisma = getPrismaClient();
  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true } });

  if (!existing) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  if (existing.role === "ADMINISTRADOR") {
    const otherActiveAdminCount = await prisma.user.count({
      where: { role: "ADMINISTRADOR", active: true, id: { not: id } },
    });
    if (otherActiveAdminCount === 0) {
      return errorResponse("No puedes eliminar al único administrador activo.", 400);
    }
  }

  await prisma.user.delete({ where: { id } });
  logger.info({
    event: "user.deleted",
    userId: id,
    actorId: sessionResult.user.id,
    actorRole: sessionResult.user.role,
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run "app/api/users/[id]/__tests__/delete-guard.test.ts"
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/api/users/[id]/route.ts" "app/api/users/[id]/__tests__/delete-guard.test.ts"
git commit -m "feat(api): add last-admin guard to DELETE /api/users/[id]"
```

---

### Task 7: `POST /api/users/[id]/reset-password` — temp password endpoint

**Files:**
- Create: `app/api/users/[id]/reset-password/route.ts`
- Test: `app/api/users/[id]/__tests__/reset-password.test.ts`

**Interfaces:**
- Produces: `POST /api/users/[id]/reset-password` → `{ tempPassword: string }` on success. Sets `mustChangePassword=true` in DB.

- [ ] **Step 1: Write the failing tests**

Create `app/api/users/[id]/__tests__/reset-password.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/users/[id]/reset-password/route";

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn() } }));

const ADMIN_SESSION = { user: { id: randomUUID(), role: "ADMINISTRADOR" as const } };

async function callPost(targetId: string) {
  return POST(
    new Request(`http://localhost/api/users/${targetId}/reset-password`, { method: "POST" }),
    { params: Promise.resolve({ id: targetId }) },
  );
}

describe("POST /api/users/[id]/reset-password", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await callPost(randomUUID());
    expect(res.status).toBe(404);
  });

  it("returns 400 when user has no local password (Google-only)", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, email: "g@test.com", passwordHash: null });
    const res = await callPost(id);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/contraseña local/);
  });

  it("returns the temp password and sets mustChangePassword=true", async () => {
    const id = randomUUID();
    prismaMock.user.findUnique.mockResolvedValue({ id, email: "local@test.com", passwordHash: "existing-hash" });
    prismaMock.user.update.mockResolvedValue({ id });

    const res = await callPost(id);
    expect(res.status).toBe(200);

    const body = await res.json() as { tempPassword: string };
    expect(typeof body.tempPassword).toBe("string");
    expect(body.tempPassword.length).toBeGreaterThan(10);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id },
        data: expect.objectContaining({ mustChangePassword: true }),
      }),
    );
  });

  it("returns 403 when caller is not ADMINISTRADOR", async () => {
    requireRoleMock.mockReturnValue({ status: 403, message: "No autorizado." });
    const res = await callPost(randomUUID());
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run the failing tests**

```bash
npx vitest run "app/api/users/[id]/__tests__/reset-password.test.ts"
```

Expected: all fail (file doesn't exist yet).

- [ ] **Step 3: Create `app/api/users/[id]/reset-password/route.ts`**

```ts
import crypto from "node:crypto";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { requireRole, requireSession } from "@/lib/authz";
import { logger } from "@/lib/logger";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para resetear contraseñas.", 403);
  }

  const { id } = await params;
  const prisma = getPrismaClient();

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!existing) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  if (!existing.passwordHash) {
    return errorResponse("Este usuario no tiene contraseña local.", 400);
  }

  const tempPassword = crypto.randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      mustChangePassword: true,
      passwordChangedAt: new Date(),
    },
  });

  logger.info({
    event: "user.password_reset_by_admin",
    userId: id,
    actorId: sessionResult.user.id,
    actorRole: sessionResult.user.role,
  });

  return NextResponse.json({ tempPassword });
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run "app/api/users/[id]/__tests__/reset-password.test.ts"
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/api/users/[id]/reset-password/route.ts" "app/api/users/[id]/__tests__/reset-password.test.ts"
git commit -m "feat(api): add POST /api/users/[id]/reset-password — generates temp password"
```

---

### Task 8: `POST /api/users/me/change-password` — self-service password change

**Files:**
- Create: `app/api/users/me/change-password/route.ts`
- Test: `app/api/users/me/__tests__/change-password.test.ts`

**Interfaces:**
- Produces: `POST /api/users/me/change-password` with `{ currentPassword, newPassword }` → `{ ok: true }`. Clears `mustChangePassword` and updates `passwordChangedAt`.

- [ ] **Step 1: Write the failing tests**

Create `app/api/users/me/__tests__/change-password.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { POST } from "@/app/api/users/me/change-password/route";

const USER_ID = randomUUID();

const { requireSessionMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/authz", () => ({ requireSession: requireSessionMock }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));

async function callPost(body: Record<string, string>) {
  return POST(
    new Request("http://localhost/api/users/me/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/users/me/change-password", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue({ user: { id: USER_ID, role: "PACIENTE" } });
  });

  it("returns 401 when not authenticated", async () => {
    requireSessionMock.mockResolvedValue({ error: { message: "No autorizado.", status: 401 } });
    const res = await callPost({ currentPassword: "a", newPassword: "b" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when user has no local password (Google-only)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: null });
    const res = await callPost({ currentPassword: "any", newPassword: "NewPass1!" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Google/);
  });

  it("returns 400 when current password is wrong", async () => {
    const hash = await bcrypt.hash("CorrectPass1!", 10);
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: hash });
    const res = await callPost({ currentPassword: "WrongPass1!", newPassword: "NewPass1!" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/incorrecta/);
  });

  it("returns 400 when new password fails policy", async () => {
    const hash = await bcrypt.hash("CorrectPass1!", 10);
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: hash });
    const res = await callPost({ currentPassword: "CorrectPass1!", newPassword: "weak" });
    expect(res.status).toBe(400);
  });

  it("returns ok:true and clears mustChangePassword on success", async () => {
    const hash = await bcrypt.hash("CorrectPass1!", 10);
    prismaMock.user.findUnique.mockResolvedValue({ passwordHash: hash });
    prismaMock.user.update.mockResolvedValue({ id: USER_ID });

    const res = await callPost({ currentPassword: "CorrectPass1!", newPassword: "NewPass1!" });
    expect(res.status).toBe(200);

    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mustChangePassword: false }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the failing tests**

```bash
npx vitest run "app/api/users/me/__tests__/change-password.test.ts"
```

Expected: all fail.

- [ ] **Step 3: Create `app/api/users/me/change-password/route.ts`**

```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireSession } from "@/lib/authz";
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from "@/lib/auth/password-policy";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida."),
  newPassword: z.string().min(8).max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
});

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { data: payload, error } = await parseJson(request, changePasswordSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: sessionResult.user.id },
    select: { passwordHash: true },
  });

  if (!user) return errorResponse("Usuario no encontrado.", 404);

  if (!user.passwordHash) {
    return errorResponse("Tu cuenta usa autenticación de Google. No tiene contraseña local.", 400);
  }

  const isMatch = await bcrypt.compare(payload.currentPassword, user.passwordHash);
  if (!isMatch) {
    return errorResponse("La contraseña actual es incorrecta.", 400);
  }

  const newHash = await bcrypt.hash(payload.newPassword, 10);
  await prisma.user.update({
    where: { id: sessionResult.user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run "app/api/users/me/__tests__/change-password.test.ts"
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/api/users/me/change-password/route.ts" "app/api/users/me/__tests__/change-password.test.ts"
git commit -m "feat(api): add POST /api/users/me/change-password — self-service password change"
```

---

### Task 9: `AdminUsersPanel` — search, filters, pagination, active toggle, reset modal

**Files:**
- Modify: `app/portal/admin/users/AdminUsersPanel.tsx`

No unit tests — this is a client component. Verify manually after `npm run dev`.

**Interfaces:**
- Consumes: `GET /api/users?search=&role=&active=&page=&pageSize=20` — response now includes `hasLocalPassword`, `_isGoogleUser`, `active`.
- Consumes: `PATCH /api/users/[id]` with `{ active: boolean }` for toggle.
- Consumes: `POST /api/users/[id]/reset-password` — returns `{ tempPassword }`.

- [ ] **Step 1: Update the `UserRecord` type**

At the top of `AdminUsersPanel.tsx`, replace the existing `UserRecord` type with:

```ts
type UserRecord = {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  hasLocalPassword: boolean;
  _isGoogleUser: boolean;
  patient?: { phone?: string | null; documentId?: string | null } | null;
  professional?: { id: string; specialty?: { id: string; name: string } | null } | null;
};
```

- [ ] **Step 2: Add new state variables**

Inside `AdminUsersPanel`, after the existing state declarations, add:

```ts
const [search, setSearch] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");
const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
const [activeFilter, setActiveFilter] = useState<"ALL" | "active" | "inactive">("ALL");
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [resetModal, setResetModal] = useState<{ userId: string; userEmail: string } | null>(null);
const [tempPassword, setTempPassword] = useState<string | null>(null);
const [resetting, setResetting] = useState(false);
```

Add debounce effect (after the existing `useEffect` for `loadData`):

```ts
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 300);
  return () => clearTimeout(timer);
}, [search]);
```

- [ ] **Step 3: Rewrite `loadData` to use filters and pagination**

Replace the existing `loadData` function:

```ts
const loadData = async () => {
  try {
    setError(null);
    setLoading(true);

    const params = new URLSearchParams({ pageSize: "20", page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (roleFilter !== "ALL") params.set("role", roleFilter);
    if (activeFilter !== "ALL") params.set("active", activeFilter === "active" ? "true" : "false");

    const [usersResponse, specialtiesResponse] = await Promise.all([
      fetchWithRetry(`/api/users?${params.toString()}`),
      fetchWithRetry("/api/specialties"),
    ]);

    if (!usersResponse.ok) throw new Error("No pudimos cargar los usuarios.");
    if (!specialtiesResponse.ok) throw new Error("No pudimos cargar las especialidades.");

    const usersJson = (await usersResponse.json()) as { data: UserRecord[]; total: number };
    const specialtiesJson = (await specialtiesResponse.json()) as Specialty[];

    setUsers(usersJson.data ?? []);
    setTotal(usersJson.total ?? 0);
    setSpecialties(specialtiesJson);
  } catch (fetchError) {
    setError(fetchError instanceof Error ? fetchError.message : "Error inesperado.");
  } finally {
    setLoading(false);
  }
};
```

Replace the existing `useEffect` for `loadData` with one that re-runs on filter changes:

```ts
useEffect(() => {
  void loadData();
}, [debouncedSearch, roleFilter, activeFilter, page]);
```

- [ ] **Step 4: Add filter bar to the users section JSX**

Inside the `<section>` that shows users, replace the div with the reload button with:

```tsx
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Usuarios</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {total > 0 ? `${total} usuario${total !== 1 ? "s" : ""}` : "Administra roles y accesos."}
      </p>
    </div>
    <button
      type="button"
      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
      onClick={() => void loadData()}
      disabled={loading}
    >
      Recargar
    </button>
  </div>

  {/* Search + filters */}
  <div className="mt-4 flex flex-col gap-3">
    <input
      className="input h-10 text-sm"
      placeholder="Buscar por nombre o correo..."
      value={search}
      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
    />
    <div className="flex flex-wrap gap-2">
      {(["ALL", "PACIENTE", "PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => { setRoleFilter(r); setPage(1); }}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
            roleFilter === r
              ? "bg-brand-teal text-white"
              : "border border-slate-200 text-slate-600 dark:border-surface-muted/70 dark:text-slate-300"
          }`}
        >
          {r === "ALL" ? "Todos" : roleLabels[r]}
        </button>
      ))}
    </div>
    <div className="flex gap-2">
      {(["ALL", "active", "inactive"] as const).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => { setActiveFilter(f); setPage(1); }}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
            activeFilter === f
              ? "bg-brand-teal text-white"
              : "border border-slate-200 text-slate-600 dark:border-surface-muted/70 dark:text-slate-300"
          }`}
        >
          {f === "ALL" ? "Todos" : f === "active" ? "Activos" : "Inactivos"}
        </button>
      ))}
    </div>
  </div>
  {/* ... rest of section ... */}
```

- [ ] **Step 5: Add `active` badge and Google badge to each user row**

In the `.map((user) => { ... })` rendering, add badges inside the user info `<div>`:

```tsx
<div className="flex flex-wrap items-center gap-1 mt-0.5">
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
    user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
  }`}>
    {user.active ? "Activo" : "Inactivo"}
  </span>
  {user._isGoogleUser && (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
      Google
    </span>
  )}
</div>
```

- [ ] **Step 6: Add active toggle and hide reset button for Google-only users**

In the actions `<div className="flex flex-wrap gap-2">`, add the toggle button and update the reset button:

```tsx
<button
  type="button"
  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
    user.active
      ? "border-red-200 text-red-600"
      : "border-green-200 text-green-600"
  }`}
  onClick={() => void toggleActive(user)}
  disabled={saving}
>
  {user.active ? "Desactivar" : "Activar"}
</button>

{user.hasLocalPassword ? (
  <button
    type="button"
    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
    onClick={() => setResetModal({ userId: user.id, userEmail: user.email })}
    disabled={saving}
  >
    Resetear password
  </button>
) : null}
```

- [ ] **Step 7: Add `toggleActive` function**

Add this function inside the component (near `applyDraft`):

```ts
const toggleActive = async (user: UserRecord) => {
  setSaving(true);
  setError(null);

  const response = await fetchWithTimeout(`/api/users/${user.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: !user.active }),
  });

  if (response.ok) {
    const updated = (await response.json()) as UserRecord;
    setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, active: updated.active } : item)));
  } else {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(body?.error ?? "No pudimos actualizar el usuario.");
  }

  setSaving(false);
};
```

- [ ] **Step 8: Add pagination bar**

Below the user list (after the `.map()` block), add:

```tsx
{total > 20 ? (
  <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
    <span>
      Mostrando {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} de {total}
    </span>
    <div className="flex gap-2">
      <button
        type="button"
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase disabled:opacity-40"
        disabled={page <= 1 || loading}
        onClick={() => setPage((p) => p - 1)}
      >
        ← Anterior
      </button>
      <button
        type="button"
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase disabled:opacity-40"
        disabled={page * 20 >= total || loading}
        onClick={() => setPage((p) => p + 1)}
      >
        Siguiente →
      </button>
    </div>
  </div>
) : null}
```

- [ ] **Step 9: Add `ResetPasswordModal` component**

Add this component inside the file, before the `AdminUsersPanel` function or as an inner component:

```tsx
function ResetPasswordModal({
  userId,
  userEmail,
  onClose,
}: {
  userId: string;
  userEmail: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [password, setPassword] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setStatus("loading");
    const response = await fetchWithTimeout(`/api/users/${userId}/reset-password`, { method: "POST" });
    if (response.ok) {
      const body = (await response.json()) as { tempPassword: string };
      setPassword(body.tempPassword);
      setStatus("done");
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorMsg(body?.error ?? "No pudimos resetear la contraseña.");
      setStatus("error");
    }
  };

  const handleCopy = () => {
    if (password) {
      void navigator.clipboard.writeText(password).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">Resetear contraseña</h3>
        <p className="mt-1 text-sm text-slate-600">{userEmail}</p>

        {status === "idle" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">
              Se generará una contraseña temporal. El usuario deberá cambiarla al iniciar sesión.
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-brand-teal py-2 text-sm font-semibold text-white"
              onClick={() => void handleReset()}
            >
              Generar contraseña temporal
            </button>
          </div>
        )}

        {status === "loading" && (
          <p className="mt-4 text-sm text-slate-500">Generando...</p>
        )}

        {status === "done" && password && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Muéstrasela al usuario ahora — no podrás verla de nuevo.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <code className="flex-1 text-sm font-mono text-slate-900 select-all">{password}</code>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <p className="mt-4 text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="button"
          className="mt-4 w-full rounded-full border border-slate-200 py-2 text-sm font-semibold text-slate-600"
          onClick={onClose}
        >
          Listo
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Render the modal**

At the bottom of the component's JSX (before the closing `</div>`), add:

```tsx
{resetModal ? (
  <ResetPasswordModal
    userId={resetModal.userId}
    userEmail={resetModal.userEmail}
    onClose={() => setResetModal(null)}
  />
) : null}
```

- [ ] **Step 11: Remove the old `resetPassword` function**

Delete the old `resetPassword` function that used `window.prompt`.

- [ ] **Step 12: Verify TypeScript**

```bash
npx tsc --noEmit
```

Fix any type errors before continuing.

- [ ] **Step 13: Commit**

```bash
git add app/portal/admin/users/AdminUsersPanel.tsx
git commit -m "feat(ui): refactor AdminUsersPanel — search, filters, pagination, active toggle, reset modal"
```

---

### Task 10: `/portal/change-password/page.tsx` — change-password page

**Files:**
- Create: `app/portal/change-password/page.tsx`
- Create: `app/portal/change-password/ChangePasswordForm.tsx`

No unit tests — server/client component. Verify manually.

**Interfaces:**
- Consumes: `auth()` from `@/auth` → `session.user.mustChangePassword`.
- Consumes: `POST /api/users/me/change-password` from Task 8.

- [ ] **Step 1: Create `ChangePasswordForm.tsx`**

Create `app/portal/change-password/ChangePasswordForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/lib/http";

interface ChangePasswordFormProps {
  isMandatory: boolean;
  defaultDashboardPath: string;
}

export function ChangePasswordForm({ isMandatory, defaultDashboardPath }: ChangePasswordFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/users/me/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });

    if (response.ok) {
      setSuccess(true);
      setTimeout(() => router.push(defaultDashboardPath), 1500);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos cambiar la contraseña.");
    }

    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-sm">
      {isMandatory && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tu contraseña fue restablecida por un administrador. Debes crear una nueva antes de continuar.
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Contraseña actual
          </label>
          <input
            type="password"
            className="input h-11 w-full text-sm"
            value={form.currentPassword}
            onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
            disabled={saving || success}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nueva contraseña
          </label>
          <input
            type="password"
            className="input h-11 w-full text-sm"
            value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
            disabled={saving || success}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Confirmar contraseña
          </label>
          <input
            type="password"
            className="input h-11 w-full text-sm"
            value={form.confirmPassword}
            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            disabled={saving || success}
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">Contraseña actualizada. Redirigiendo...</p> : null}

        <button
          type="submit"
          className="w-full rounded-full bg-brand-teal py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={saving || success || !form.currentPassword || !form.newPassword || !form.confirmPassword}
        >
          {saving ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/portal/change-password/page.tsx`**

```tsx
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const defaultDashboardPath = getDefaultDashboardPath(session.user.role ?? "PACIENTE");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/10">
        <h1 className="text-xl font-semibold text-slate-900">Cambiar contraseña</h1>
        <p className="mt-1 text-sm text-slate-500">
          Elige una contraseña segura con al menos 8 caracteres, mayúscula, número y símbolo.
        </p>
        <div className="mt-6">
          <ChangePasswordForm
            isMandatory={session.user.mustChangePassword ?? false}
            defaultDashboardPath={defaultDashboardPath}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Run the full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass; no new failures.

- [ ] **Step 5: Commit**

```bash
git add app/portal/change-password/
git commit -m "feat(ui): add /portal/change-password page — forced and voluntary password change"
```

---

## Final verification

After all tasks are done, run:

```bash
npx vitest run
npx tsc --noEmit
```

Both should pass with zero errors. Manual testing checklist:
- [ ] Admin panel loads and shows all users
- [ ] Search by name/email filters results
- [ ] Role filter pills work
- [ ] Active/Inactive filter works
- [ ] Pagination navigates between pages
- [ ] Activar/Desactivar toggle works
- [ ] Resetear password modal generates temp password (shown once, copyable)
- [ ] After admin reset, user logging in with temp password is redirected to `/portal/change-password`
- [ ] Changing password on `/portal/change-password` redirects to dashboard
- [ ] Cannot change own role in admin panel
- [ ] Cannot delete last ADMINISTRADOR
- [ ] Google SSO users do not show "Resetear password" button
