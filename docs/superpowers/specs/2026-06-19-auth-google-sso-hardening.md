# Auth — Google SSO + Security Hardening

**Fecha:** 2026-06-19  
**Estado:** Aprobado para implementación  
**Alcance:** Corregir huecos de seguridad en el flujo de autenticación existente y añadir Google SSO seguro con lógica de autorización estricta.

---

## Contexto

DentPro Colombia tiene un sistema de autenticación funcional con email/password (NextAuth + Credentials provider). Google SSO está parcialmente configurado pero tiene vulnerabilidades críticas que impiden su uso seguro en producción. Este spec cubre los cambios necesarios para:

1. Eliminar el vector de account takeover por email linking
2. Forzar `User.active` como control de acceso para todos los providers
3. Completar Google SSO con las restricciones requeridas
4. Añadir rate limiting en el endpoint de autenticación
5. Fortalecer logging y respuestas del sistema

---

## Restricciones no negociables

- Login canónico permanece en `/auth/login` — no mover, no duplicar
- Roles válidos exactos: `PACIENTE`, `PROFESIONAL`, `RECEPCIONISTA`, `ADMINISTRADOR` — no cambiar
- El rol siempre viene de Neon (tabla `User.role`) — nunca del perfil de Google
- Google SSO permite acceso solo si: email existe en Neon AND `User.active === true`
- Google SSO NO puede crear usuarios con rol PROFESIONAL, RECEPCIONISTA, ADMINISTRADOR
- `passwordHash` nunca aparece en JWT, sesión ni logs
- No romper el flujo de login email/password existente

---

## Schema — cambio aprobado

`User.active Boolean @default(true)` ya fue añadido a `prisma/schema.prisma`.

**Migration a ejecutar en producción:**
```sql
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
```
Safe, non-blocking: columna con default, no afecta filas existentes.

---

## Arquitectura del sistema auth (estado objetivo)

```
/auth/login
   ├── Credentials (email/password)
   │    └── authorizeCredentials() → authenticateUser() → bcrypt.compare()
   │         └── BLOQUEA si User.active === false
   └── Google OAuth
        └── signIn callback
             ├── Verifica email_verified === true
             ├── Consulta User en Neon por email
             ├── BLOQUEA si !existingUser && GOOGLE_AUTO_CREATE_PATIENTS !== "true"
             ├── BLOQUEA si existingUser.active === false
             └── PERMITE si existingUser.active === true
                  └── jwt callback → carga role, professionalId, patientId desde DB
```

---

## Cambios por archivo

### `prisma/schema.prisma` — HECHO

```prisma
model User {
  // ...
  active Boolean @default(true)  // ← añadido
  // ...
}
```

### `lib/auth/users.ts`

Añadir `active` al `select` de `findUserByEmail` y `findUserById` para que el campo esté disponible en los callbacks.

**`DatabaseUser` interface:**
```ts
export interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;           // ← nuevo
  professionalId?: string | null;
  patientId?: string | null;
  passwordChangedAt?: Date | null;
  mfaEnabled?: boolean;
}
```

**`findUserByEmail` select:**
```ts
select: {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,              // ← nuevo
  passwordChangedAt: true,
  mfaEnabled: true,
  professional: { select: { id: true } },
  patient: { select: { id: true } },
}
```

Mismo cambio en `findUserById` y en el `select` dentro de `authenticateUser`.

### `lib/auth/credentials.ts`

Bloquear login si `user.active === false` antes de retornar:

```ts
const user = await authenticateUser(email, password);
if (!user) {
  logger.warn({ event: "auth.credentials.invalid" });
  return null;
}

// Bloquear cuenta inactiva
if (!user.active) {
  logger.warn({ event: "auth.credentials.account_inactive", userId: user.id });
  return null;
}
```

El mensaje de error al cliente es genérico (`CredentialsSignin`) — no revelar si la cuenta existe o está inactiva.

### `auth.config.ts`

**Cambio 1: Quitar `allowDangerousEmailAccountLinking`**

```ts
// ANTES:
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  allowDangerousEmailAccountLinking: true,  // ← ELIMINAR
})

// DESPUÉS:
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
})
```

Sin este flag, si un email ya existe como cuenta Credentials, Google no puede vincularse automáticamente — NextAuth retorna `OAuthAccountNotLinked` error, redirigiendo al login con error. Esto es el comportamiento correcto y seguro.

**Cambio 2: `signIn` callback verifica `user.active`**

```ts
async signIn({ account, profile }) {
  if (account?.provider !== "google") return true;

  const profileEmail = typeof profile?.email === "string" ? profile.email.toLowerCase() : "";
  const emailVerified = profile?.email_verified === true;

  if (!profileEmail || !emailVerified) {
    void logAuditEvent({
      action: "auth.oauth.signin_rejected",
      resourceType: "auth",
      status: "failure",
      metadata: {
        provider: "google",
        reason: !profileEmail ? "missing_email" : "email_not_verified",
      },
    });
    return false;
  }

  const existingUser = await findUserByEmail(profileEmail);

  if (!existingUser) {
    if (process.env.GOOGLE_AUTO_CREATE_PATIENTS !== "true") {
      void logAuditEvent({
        action: "auth.oauth.signin_rejected",
        resourceType: "auth",
        status: "failure",
        metadata: { provider: "google", reason: "user_not_found" },
      });
      return false;
    }
    return true; // Adapter creará usuario PACIENTE nuevo
  }

  // Usuario existe — verificar que esté activo
  if (!existingUser.active) {
    void logAuditEvent({
      action: "auth.oauth.signin_rejected",
      resourceType: "auth",
      status: "failure",
      metadata: {
        provider: "google",
        userId: existingUser.id,
        reason: "account_inactive",
      },
    });
    return false;
  }

  return true;
},
```

**Cambio 3: `session` callback limpia user cuando `invalidated`**

```ts
async session({ session, token }) {
  const sessionToken = token as SessionToken;

  if (sessionToken.invalidated) {
    // Sesión invalidada (password cambió) — no propagar datos de usuario
    session.user = undefined;
    return session;
  }
  // ... resto igual
}
```

**Cambio 4: `jwt` callback — `resolveTokenRole` no defaultea silenciosamente**

El fallback a "PACIENTE" cuando el rol es inválido es un riesgo. Si el token tiene un rol corrupto, la sesión debe invalidarse, no downgrade:

```ts
// En jwt callback, después de cargar desde DB:
if (!dbUser && !isUserRole(sessionToken.role as string)) {
  sessionToken.invalidated = true;
  return sessionToken;
}
```

### `middleware.ts` — NUEVO archivo en raíz

Rate limiting sobre las rutas auth usando Upstash Redis (`UPSTASH_REDIS_REST_URL` ya está en `.env.example`):

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/api/auth/signin", "/api/auth/callback"];
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (!isAuthRoute) return NextResponse.next();

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashUrl || !upstashToken) return NextResponse.next(); // Sin Redis, sin rate limiting

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  const key = `rl:auth:${ip}`;

  try {
    const res = await fetch(`${upstashUrl}/incr/${key}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    const { result: count } = await res.json() as { result: number };

    if (count === 1) {
      await fetch(`${upstashUrl}/expire/${key}/${RATE_LIMIT_WINDOW_SECONDS}`, {
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
    }

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return new NextResponse("Too many requests", { status: 429 });
    }
  } catch {
    // Si Redis falla, no bloquear el request
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
```

> Si `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` no están configurados, el middleware pasa sin rate limiting — safe degradation.

---

## Variables de entorno requeridas

| Variable | Requerida | Nota |
|---|---|---|
| `DATABASE_URL` | Sí | Neon pooled connection string |
| `AUTH_JWT_SECRET` | Sí | Mínimo 32 chars aleatorios |
| `NEXTAUTH_URL` | En producción | URL canónica del sitio |
| `GOOGLE_CLIENT_ID` | Para SSO | ID de Google OAuth app |
| `GOOGLE_CLIENT_SECRET` | Para SSO | Secret de Google OAuth app |
| `GOOGLE_AUTO_CREATE_PATIENTS` | Opcional | `"false"` en producción (no auto-crear) |
| `UPSTASH_REDIS_REST_URL` | Para rate limiting | De Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | Para rate limiting | De Upstash dashboard |

---

## Riesgos de la migration

**`User.active`** — La migration es safe (columna con DEFAULT). Todos los usuarios existentes en Neon quedan con `active=true` automáticamente. No hay rollback necesario si se revierte el código — la columna es ignorada por el código anterior.

**`allowDangerousEmailAccountLinking: false` (default)** — Si algún usuario existente en Neon ya tiene una cuenta Google vinculada (registro en tabla `Account`), esto NO los afecta. Solo impide nuevas vinculaciones automáticas.

---

## Tests mínimos

| Test | Archivo | Descripción |
|---|---|---|
| Credentials válidas → sesión con rol correcto | `lib/auth/__tests__/credentials.test.ts` | Los 4 roles |
| Credentials inválidas → `null` sin fugar email | `lib/auth/__tests__/credentials.test.ts` | Mensaje genérico |
| Credentials con `active=false` → `null` | `lib/auth/__tests__/credentials.test.ts` | Cuenta inactiva bloqueada |
| Google: usuario existe + active → `true` | `lib/auth/__tests__/signIn-callback.test.ts` | Acceso permitido |
| Google: usuario existe + `active=false` → `false` | `lib/auth/__tests__/signIn-callback.test.ts` | Bloqueado |
| Google: usuario no existe + `GOOGLE_AUTO_CREATE_PATIENTS=false` → `false` | `lib/auth/__tests__/signIn-callback.test.ts` | Bloqueado |
| Google: `email_verified=false` → `false` | `lib/auth/__tests__/signIn-callback.test.ts` | Bloqueado |
| JWT invalidado por `passwordChangedAt` | `lib/auth/__tests__/jwt.test.ts` | Token emitido antes de cambio rechazado |
| Rate limiting: 11+ requests → 429 | `middleware.test.ts` | Con Redis mock |

---

## Criterio de producción

- [ ] Migration ejecutada en Neon: `User.active` columna existe
- [ ] `allowDangerousEmailAccountLinking` eliminado de `GoogleProvider`
- [ ] `signIn` callback bloquea Google si `!existingUser.active`
- [ ] `authenticateUser` retorna `null` si `!user.active`
- [ ] `session` callback retorna sesión vacía cuando `invalidated`
- [ ] `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` configurados en Vercel (prod + preview)
- [ ] `GOOGLE_AUTO_CREATE_PATIENTS=false` en producción
- [ ] Rate limiting activo (o `UPSTASH_REDIS_REST_URL` configurado)
- [ ] E2E login de los 4 roles pasa
- [ ] Google SSO con email desconocido → bloqueado
- [ ] Google SSO con email de usuario inactivo → bloqueado
- [ ] `npm run build` sin errores
