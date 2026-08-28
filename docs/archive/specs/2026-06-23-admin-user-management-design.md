# Admin User Management — Design Spec

**Date:** 2026-06-23  
**Branch scope:** Feature añadida sobre `claude/fix-auth-decode-next16` sin romper los fixes de auth (PR #371).

---

## Context

DentPro Colombia manages users across four roles: PACIENTE, PROFESIONAL, RECEPCIONISTA, ADMINISTRADOR. Users are created locally (credentials) or auto-provisioned via Google SSO (role PACIENTE). The existing `AdminUsersPanel` + `/api/users` routes already handle basic CRUD, but have gaps:

- No search/filter → unusable at 500+ users
- `active` field never exposed in UI → can't block users
- Password reset uses `window.prompt()` → security smell
- No guard against an admin removing the last ADMINISTRADOR
- No self-service password change for logged-in users

---

## Goals

1. Make the admin panel usable at 500+ users (search, filter, pagination)
2. Expose `active`/inactive toggle so blocked users cannot login
3. Secure password reset: admin-initiated temp password, shown once
4. Self-service password change for logged-in users (A only; email-based forgot-password is out of scope)
5. Access control guards: no self-role-change, no deleting/deactivating the last ADMINISTRADOR

---

## Out of Scope

- Forgot-password via email (PasswordResetToken model exists but email service not configured)
- Bulk operations
- CSV export
- 2FA enforcement

---

## Security Constraints (non-negotiable)

- Passwords never exposed in GET responses (`passwordHash` always redacted)
- Admin cannot change their own role or deactivate themselves
- System must always have at least one active ADMINISTRADOR
- Google SSO users (`passwordHash IS NULL`) never get a temp password — reset button is hidden for them
- All role changes are logged via `logger.info({ event: "user.role_changed", ... })`
- `active = false` blocks both credentials login and Google SSO (already implemented; must remain)
- Temp password generated with `crypto.randomBytes(12).toString("base64url")` — 16 URL-safe chars

---

## Schema Change

Add one field to `User`:

```prisma
model User {
  // ... existing fields ...
  mustChangePassword Boolean @default(false)   // set true when admin resets password
}
```

Migration: `prisma migrate dev --name add_must_change_password`

No data migration needed — existing users default to `false`.

---

## JWT Changes

Add `mustChangePassword` to the session token so the middleware can intercept without a DB query per request.

In `auth.config.ts` → `jwt` callback: read `dbUser.mustChangePassword`, store as `sessionToken.mustChangePassword`.  
In `auth.ts` → `auth()` function: read `token["mustChangePassword"]` and include it in the returned session.

Type additions:
```ts
// auth.config.ts
type SessionToken = JWT & {
  // ...existing fields...
  mustChangePassword?: boolean;
};
// auth.ts AuthenticatedUser
type AuthenticatedUser = {
  // ...existing fields...
  mustChangePassword?: boolean;
};
```

---

## Middleware Change

In `middleware.ts` (or `app/proxy.ts` depending on where route protection lives), add:

```ts
// After session check, before role-based redirect:
if (session?.user?.mustChangePassword && !pathname.startsWith("/portal/change-password")) {
  return NextResponse.redirect(new URL("/portal/change-password", req.url));
}
```

This ensures any portal route for a user with `mustChangePassword = true` redirects until they change it.

---

## API Changes

### 1. `GET /api/users` — Add search + filter params

New accepted query params:
- `search` — case-insensitive substring match on `name`, `lastName`, or `email`
- `role` — one of `PACIENTE | PROFESIONAL | RECEPCIONISTA | ADMINISTRADOR`
- `active` — `"true"` | `"false"` (omit = all)

Response shape adds two computed fields:
```ts
{
  // ...existing user fields (passwordHash always redacted)...
  hasLocalPassword: boolean  // true if passwordHash IS NOT NULL — controls reset button visibility
  _isGoogleUser: boolean     // true if user has a Google account — for display badge only
}
```

Prisma query change: add `include: { accounts: { select: { provider: true } } }` then map:
- `hasLocalPassword = existing.passwordHash !== null`
- `_isGoogleUser = accounts.some(a => a.provider === "google")`

Both fields are computed server-side; `passwordHash` itself is never sent to the client.

### 2. `PATCH /api/users/[id]` — Add guards

Before applying changes, check:

```ts
// Guard 1: no self-role-change
if (id === sessionResult.user.id && payload.role && payload.role !== existing.role) {
  return errorResponse("No puedes cambiar tu propio rol.", 403);
}

// Guard 2: no deactivating self
if (id === sessionResult.user.id && payload.active === false) {
  return errorResponse("No puedes desactivarte a ti mismo.", 403);
}

// Guard 3: no demoting/deactivating last admin
if (existing.role === "ADMINISTRADOR") {
  const isDemoting = payload.role && payload.role !== "ADMINISTRADOR";
  const isDeactivating = payload.active === false;
  if (isDemoting || isDeactivating) {
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMINISTRADOR", active: true, id: { not: id } },
    });
    if (activeAdminCount === 0) {
      return errorResponse("No puedes degradar o desactivar al único administrador activo.", 400);
    }
  }
}
```

### 3. `DELETE /api/users/[id]` — Add last-admin guard

```ts
if (existing.role === "ADMINISTRADOR") {
  const activeAdminCount = await prisma.user.count({
    where: { role: "ADMINISTRADOR", active: true, id: { not: id } },
  });
  if (activeAdminCount === 0) {
    return errorResponse("No puedes eliminar al único administrador activo.", 400);
  }
}
```

### 4. NEW `POST /api/users/[id]/reset-password`

- Auth: `requireRole(["ADMINISTRADOR"])`
- Reject if `existing.passwordHash === null` (no local password): `return errorResponse("Este usuario no tiene contraseña local.", 400)`
- Generate: `const tempPassword = crypto.randomBytes(12).toString("base64url")`
- Hash + save: `bcrypt.hash(tempPassword, 10)` → `prisma.user.update({ passwordHash, mustChangePassword: true, passwordChangedAt: new Date() })`
- Log: `logger.info({ event: "user.password_reset_by_admin", userId: id, actorId })`
- Return: `NextResponse.json({ tempPassword })` — returned only once, never stored in plaintext
- File: `app/api/users/[id]/reset-password/route.ts`

### 5. NEW `POST /api/users/me/change-password`

- Auth: any logged-in role via `requireSession()`
- Fetch user from DB; reject if `user.passwordHash === null` (no local password — pure Google users have no password to change)
- Schema:
  ```ts
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
  });
  ```
- Verify `currentPassword` against `user.passwordHash` via `bcrypt.compare`
- Update: `passwordHash = bcrypt.hash(newPassword, 10)`, `mustChangePassword = false`, `passwordChangedAt = new Date()`
- Return `{ ok: true }` — client re-triggers session refresh
- File: `app/api/users/me/change-password/route.ts`

---

## UI Changes

### `AdminUsersPanel` — Refactor (same file, same component)

**New state:**
```ts
const [search, setSearch] = useState("");
const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
const [activeFilter, setActiveFilter] = useState<"ALL" | "true" | "false">("ALL");
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
```

**Search + filter bar** (above the user list):
- Text input with 300ms debounce triggering `loadData()`
- Role pills: "Todos" | "Paciente" | "Profesional" | "Recepcionista" | "Administrador"
- Toggle: "Activos" | "Inactivos" | "Todos"

**Pagination bar** (below list):
- "← Anterior" / "Siguiente →" buttons
- "Mostrando 1–20 de 347"
- Page size fixed at 20

**Per-user row changes:**
- `_isGoogleUser && !passwordHash` → show badge `Google` (slate pill)
- `user.active` → show badge `Activo` (green) / `Inactivo` (red)
- Button `Desactivar` / `Activar` → calls `PATCH /api/users/[id]` with `{ active: !user.active }`
- Role selector disabled if `user.id === currentUserId` (tooltip: "No puedes cambiar tu propio rol")
- "Resetear password" hidden if `!hasLocalPassword`; otherwise opens `ResetPasswordModal`

**ResetPasswordModal** (new component, same file or separate):
- Calls `POST /api/users/[id]/reset-password`
- Shows temp password in readonly input + "Copiar" button (uses `navigator.clipboard.writeText`)
- Warning text: "Muéstrasela al usuario ahora — no podrás verla de nuevo."
- Single close button "Listo" (no X close, no outside-click dismiss)
- On error: shows error message inline

### NEW page: `/portal/change-password`

File: `app/portal/change-password/page.tsx`

- Visible to all authenticated roles
- If `session.user.mustChangePassword`, shows banner: "Tu contraseña fue restablecida por un administrador. Debes crear una nueva antes de continuar."
- Form: `Contraseña actual` + `Nueva contraseña` + `Confirmar contraseña`
- On submit: `POST /api/users/me/change-password`
- On success: `router.push(session.user.defaultDashboardPath ?? "/portal")`
- Also accessible voluntarily from user profile (not just forced redirect)

---

## File Map

| Action | File |
|---|---|
| Modify | `prisma/schema.prisma` — add `mustChangePassword` |
| Migrate | run `prisma migrate dev --name add_must_change_password` |
| Modify | `auth.config.ts` — persist `mustChangePassword` in JWT |
| Modify | `auth.ts` — expose `mustChangePassword` from decoded token |
| Modify | `middleware.ts` or `app/proxy.ts` — redirect if `mustChangePassword` |
| Modify | `app/api/users/route.ts` — add search/filter/active params + `_isGoogleUser` |
| Modify | `app/api/users/[id]/route.ts` — add guards to PATCH + DELETE |
| Create | `app/api/users/[id]/reset-password/route.ts` |
| Create | `app/api/users/me/change-password/route.ts` |
| Modify | `app/portal/admin/users/AdminUsersPanel.tsx` — all UI changes |
| Create | `app/portal/change-password/page.tsx` |

---

## Testing Requirements

- Unit: `GET /api/users` with `?search=`, `?role=`, `?active=` params
- Unit: `PATCH /api/users/[id]` — self-role-change rejected, last-admin guard
- Unit: `DELETE /api/users/[id]` — last-admin guard
- Unit: `POST /api/users/[id]/reset-password` — Google user rejected, temp password returned once
- Unit: `POST /api/users/me/change-password` — wrong current password rejected, `mustChangePassword` cleared
- Integration: JWT callback persists `mustChangePassword`; middleware redirects to `/portal/change-password`
- E2E (Playwright): admin changes role, temp password flow, self-service change, deactivate/reactivate user
