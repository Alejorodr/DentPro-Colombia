# Content CMS Unification and Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify WhatsApp/Teléfono/Email/redes sociales into a single source of truth with per-placement visibility, merge the two marketing-vs-operational duplicated entities (Especialistas→Staff, Servicios→catálogo clínico), and split the 46-field giant settings form into independent panels — collapsing the admin Content sidebar from 22 entries (10 of them duplicate deep-links) down to one real entry per editable surface.

**Architecture:** Two new/extended Prisma models (`HomepageChannel`, `HomepageSocialLink.placements`) back a unified "Información de empresa" admin section; `ProfessionalProfile` and `Service` each gain additive marketing columns (zero changes to their operational fields/relations) so the public Especialistas/Servicios sections read directly from the real operational tables instead of disconnected marketing-only copies; the giant settings form splits into five independent single-purpose panels following the same pattern already used by every CRUD-list panel in this codebase.

**Tech Stack:** Next.js 16 App Router, Prisma, Tailwind v4, existing `Card`/`STATUS_COLORS`/`CollapsibleCard`/`AdminImageField` tokens, Zod validation, `fetchWithRetry`/`fetchWithTimeout` from `lib/http`.

## Global Constraints

- Locked blue-only palette, no new colors/tokens. Reuse `Card.tsx`, existing modal/panel chrome.
- Icons only via `@/components/ui/Icon.tsx` barrel.
- Español tú-form, sentence case, no exclamation marks except one success message per page.
- Every new interactive element ships all states (default/hover/focus-visible/active/disabled/loading/error/success), matching the discipline already established in this codebase's CRUD panels.
- `showOnHomepage`/`isActive`-style flags always default to values that don't change the site's current visible behavior on deploy (migrations preserve today's visual output; nothing goes blank).
- No changes to `priceCents`, `durationMinutes`, `specialtyId`, or any `ProfessionalService`/`Appointment`/scheduling relation on `Service` or `ProfessionalProfile` — this plan only adds nullable/defaulted marketing columns to those two models.
- Repo lives under OneDrive — if `npm run build` hits `EPERM` or a Turbopack worker crash, delete `.next` and rebuild once before treating it as a real failure. `npx prisma migrate dev` requires `SHADOW_DATABASE_URL` in `.env.local` to be set (already configured in this project) — if a fresh environment lacks it, use `prisma migrate diff` + `prisma migrate deploy` instead (documented working pattern in this repo's history).
- Verification gate for every task: `npm run build && npm run typecheck && npm run lint && npm run test`.
- Never dispatch multiple implementer subagents in parallel — tasks are sequential, later tasks edit files earlier tasks create.

---

# Part 1 — Canales, redes sociales, Información de empresa

*(implements `docs/archive/specs/2026-08-19-company-info-channels-unification-design.md`)*

### Task 1: Prisma schema — HomepageChannel + placements

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: enum `HomepageContentPlacement` (`INFOBAR`, `FLOATING`, `FOOTER`, `BOOKING`); model `HomepageChannel` with `id, type (HomepageChannelType), value, label, placements (HomepageContentPlacement[]), sortOrder, isActive, createdAt, updatedAt`; `HomepageSocialLink` gains `placements HomepageContentPlacement[]`.

- [ ] **Step 1: Add the enums and model**

In `prisma/schema.prisma`, add after the closing brace of `model HomepageSocialLink` (currently ~line 908):

```prisma
enum HomepageContentPlacement {
  INFOBAR
  FLOATING
  FOOTER
  BOOKING
}

enum HomepageChannelType {
  WHATSAPP
  PHONE
  EMAIL
}

model HomepageChannel {
  id         String                     @id @default(uuid())
  type       HomepageChannelType
  value      String
  label      String
  placements HomepageContentPlacement[]
  sortOrder  Int                        @default(0)
  isActive   Boolean                    @default(true)
  createdAt  DateTime                   @default(now())
  updatedAt  DateTime                   @updatedAt

  @@index([isActive, sortOrder])
}
```

- [ ] **Step 2: Add `placements` to `HomepageSocialLink`**

Find `model HomepageSocialLink` and add the field right after `iconKey`:

```prisma
model HomepageSocialLink {
  id         String                     @id @default(uuid())
  href       String
  label      String
  iconKey    String
  placements HomepageContentPlacement[]
  sortOrder  Int                        @default(0)
  isActive   Boolean                    @default(true)
  createdAt  DateTime                   @default(now())
  updatedAt  DateTime                   @updatedAt

  @@index([isActive, sortOrder])
}
```

- [ ] **Step 3: Generate and apply the migration**

```bash
npx prisma migrate dev --name add_homepage_channels
```

If `migrate dev` hangs or errors on shadow-DB creation (only happens if `SHADOW_DATABASE_URL` is missing from `.env.local` — check first with `grep SHADOW_DATABASE_URL .env.local`), fall back to:
```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > /tmp/channels_migration.sql
```
then create the migration folder manually with that SQL and apply via `npx prisma migrate deploy` (documented working pattern already used in this repo).

- [ ] **Step 4: Verify**

`npx prisma validate && npm run typecheck` — the generated Prisma Client must expose `prisma.homepageChannel` and the `placements` field on `homepageSocialLink`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add HomepageChannel model and placements to HomepageSocialLink"
```

---

### Task 2: Data migration — consolidate existing WhatsApp/phone/email/social data

**Files:**
- Create: `scripts/migrate-homepage-channels.mjs` (one-off script, not part of the app runtime — deleted after running, per Step 5)

**Interfaces:**
- Consumes: `prisma.homepageSettings` (singleton, fields `infoBarWhatsappHref`, `infoBarWhatsappLabel`, `floatingWhatsappNumber`, `contactWhatsapp`, `floatingPhoneNumber`, `contactPhone`, `infoBarEmailHref`, `infoBarEmailLabel`, `contactEmail`), `prisma.homepageSocialLink`.
- Produces: rows in `prisma.homepageChannel`; updates existing `prisma.homepageSocialLink` rows' `placements`.

- [ ] **Step 1: Write the migration script**

```js
// scripts/migrate-homepage-channels.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const settings = await prisma.homepageSettings.findUnique({ where: { id: "homepage-main" } });
if (!settings) {
  console.log("No settings row found, nothing to migrate.");
  process.exit(0);
}

// Dedupe WhatsApp: infoBarWhatsappHref (e.g. "https://wa.me/573237968435"),
// floatingWhatsappNumber (e.g. "573237968435"), contactWhatsapp (display text)
// all represent the same real number. Extract digits from whichever is present.
function digitsOnly(value) {
  return value ? value.replace(/\D/g, "") : null;
}

const whatsappValue =
  digitsOnly(settings.floatingWhatsappNumber) ??
  digitsOnly(settings.infoBarWhatsappHref) ??
  digitsOnly(settings.contactWhatsapp);

const phoneValue = digitsOnly(settings.floatingPhoneNumber) ?? digitsOnly(settings.contactPhone);

const emailValue = settings.contactEmail ?? settings.infoBarEmailHref?.replace(/^mailto:/, "") ?? null;

let created = 0;

if (whatsappValue) {
  await prisma.homepageChannel.create({
    data: {
      type: "WHATSAPP",
      value: whatsappValue,
      label: settings.infoBarWhatsappLabel ?? "Agenda por WhatsApp",
      placements: ["INFOBAR", "FLOATING", "FOOTER", "BOOKING"],
      sortOrder: 0,
      isActive: true,
    },
  });
  created++;
}

if (phoneValue) {
  await prisma.homepageChannel.create({
    data: {
      type: "PHONE",
      value: phoneValue,
      label: "Llamar a DentPro",
      placements: ["FLOATING", "FOOTER"],
      sortOrder: 1,
      isActive: true,
    },
  });
  created++;
}

if (emailValue) {
  await prisma.homepageChannel.create({
    data: {
      type: "EMAIL",
      value: emailValue,
      label: settings.infoBarEmailLabel ?? emailValue,
      placements: ["INFOBAR", "FOOTER"],
      sortOrder: 2,
      isActive: true,
    },
  });
  created++;
}

const socialLinks = await prisma.homepageSocialLink.findMany();
for (const link of socialLinks) {
  await prisma.homepageSocialLink.update({
    where: { id: link.id },
    data: { placements: ["INFOBAR", "FOOTER"] },
  });
}

console.log(`Created ${created} HomepageChannel rows. Updated ${socialLinks.length} HomepageSocialLink rows with placements.`);

await prisma.$disconnect();
await pool.end();
```

- [ ] **Step 2: Run it against the real database**

```bash
node --env-file=.env.local scripts/migrate-homepage-channels.mjs
```

- [ ] **Step 3: Verify counts**

Confirm via a quick Prisma query (or the admin panel once Task 6 ships) that the expected number of `HomepageChannel` rows exist and match the pre-migration values (WhatsApp/phone/email digits should match what was in `HomepageSettings` before this ran).

- [ ] **Step 4: Delete the script**

```bash
rm scripts/migrate-homepage-channels.mjs
```

- [ ] **Step 5: Commit**

The script itself is not committed (it's deleted in Step 4) — there's nothing to commit for this task; it's a one-time data operation against the real database, not a code change. Note the migration result in your task report for the reviewer.

---

### Task 3: API — CRUD + reorder for channels

**Files:**
- Create: `app/api/admin/homepage/channels/route.ts`
- Create: `app/api/admin/homepage/channels/[id]/route.ts`
- Create: `app/api/admin/homepage/channels/reorder/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `requiredText`, `optionalHref`-equivalent helpers from `../_lib` (or inline, matching the pattern in `app/api/admin/homepage/settings/route.ts`); `getPrismaClient`; `logAuditEvent`; `parseJson`; `errorResponse`.
- Produces: `GET /api/admin/homepage/channels` → `{channels: ChannelPayload[]}`; `POST` → `{channel: ChannelPayload}` (201); `PATCH /api/admin/homepage/channels/[id]` → `{channel: ChannelPayload}`; `DELETE` → `{ok: true}`; `PATCH .../reorder` with `{orderedIds: string[]}` → `{ok: true}`. `ChannelPayload = {id, type, value, label, placements, sortOrder, isActive}`.

Mirrors `app/api/admin/homepage/social-links/{route.ts,[linkId]/route.ts,reorder/route.ts}` exactly (already read in full earlier this session), adapted for `type`/`value` instead of `iconKey`/`href`, and `placements` validation.

- [ ] **Step 1: Create `app/api/admin/homepage/channels/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../_lib";

const PLACEMENTS = ["INFOBAR", "FLOATING", "FOOTER", "BOOKING"] as const;
const CHANNEL_TYPES = ["WHATSAPP", "PHONE", "EMAIL"] as const;

function validateValue(type: string, value: string) {
  if (type === "EMAIL") return z.string().email().safeParse(value).success;
  // WhatsApp/Phone: digits only, 7-15 chars (E.164-ish, no strict validation needed here)
  return /^\d{7,15}$/.test(value);
}

const channelCreateSchema = z
  .object({
    type: z.enum(CHANNEL_TYPES),
    value: requiredText(1, 200),
    label: requiredText(1, 120),
    placements: z.array(z.enum(PLACEMENTS)).default([]),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => validateValue(payload.type, payload.value), {
    message: "Valor inválido para el tipo de canal seleccionado.",
    path: ["value"],
  });

type ChannelRecord = {
  id: string;
  type: string;
  value: string;
  label: string;
  placements: string[];
  sortOrder: number;
  isActive: boolean;
};

function serializeChannel(channel: ChannelRecord) {
  return {
    id: channel.id,
    type: channel.type,
    value: channel.value,
    label: channel.label,
    placements: channel.placements,
    sortOrder: channel.sortOrder,
    isActive: channel.isActive,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const prisma = getPrismaClient();
  const channels = await prisma.homepageChannel.findMany({ orderBy: { sortOrder: "asc" } });

  return NextResponse.json({ channels: channels.map(serializeChannel) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, channelCreateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const maxSort = await prisma.homepageChannel.aggregate({ _max: { sortOrder: true } });

  const channel = await prisma.homepageChannel.create({
    data: {
      type: body.type,
      value: body.value,
      label: body.label,
      placements: body.placements,
      isActive: body.isActive ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.channels.created",
    resourceType: "homepage_channel",
    resourceId: channel.id,
    targetLabel: channel.label,
    status: "success",
    metadata: { type: channel.type, placements: channel.placements },
  });

  return NextResponse.json({ channel: serializeChannel(channel) }, { status: 201 });
}
```

- [ ] **Step 2: Create `app/api/admin/homepage/channels/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin, requiredText } from "../../_lib";

const PLACEMENTS = ["INFOBAR", "FLOATING", "FOOTER", "BOOKING"] as const;
const CHANNEL_TYPES = ["WHATSAPP", "PHONE", "EMAIL"] as const;

const channelUpdateSchema = z
  .object({
    type: z.enum(CHANNEL_TYPES).optional(),
    value: requiredText(1, 200).optional(),
    label: requiredText(1, 120).optional(),
    placements: z.array(z.enum(PLACEMENTS)).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, "Debes enviar al menos un campo para actualizar.");

type ChannelRecord = {
  id: string;
  type: string;
  value: string;
  label: string;
  placements: string[];
  sortOrder: number;
  isActive: boolean;
};

function serializeChannel(channel: ChannelRecord) {
  return {
    id: channel.id,
    type: channel.type,
    value: channel.value,
    label: channel.label,
    placements: channel.placements,
    sortOrder: channel.sortOrder,
    isActive: channel.isActive,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { data: body, error } = await parseJson(request, channelUpdateSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const existing = await prisma.homepageChannel.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("Canal no encontrado.", 404);
  }

  const updated = await prisma.homepageChannel.update({ where: { id }, data: body });

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.channels.updated",
    resourceType: "homepage_channel",
    resourceId: updated.id,
    targetLabel: updated.label,
    status: "success",
    metadata: { changedFields: Object.keys(body) },
  });

  return NextResponse.json({ channel: serializeChannel(updated) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const prisma = getPrismaClient();

  const existing = await prisma.homepageChannel.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("Canal no encontrado.", 404);
  }

  await prisma.homepageChannel.delete({ where: { id } });

  const remaining = await prisma.homepageChannel.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true } });
  await prisma.$transaction(
    remaining.map((item: { id: string }, index: number) =>
      prisma.homepageChannel.update({ where: { id: item.id }, data: { sortOrder: index } }),
    ),
  );

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.channels.deleted",
    resourceType: "homepage_channel",
    resourceId: existing.id,
    targetLabel: existing.label,
    status: "success",
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create `app/api/admin/homepage/channels/reorder/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { logAuditEvent } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";

import { requireAdmin } from "../../_lib";

const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()).min(1) });

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: body, error } = await parseJson(request, reorderSchema);
  if (error) return error;

  const prisma = getPrismaClient();
  const channels = await prisma.homepageChannel.findMany({ select: { id: true } });

  if (channels.length !== body.orderedIds.length) {
    return errorResponse("La lista de orden no coincide con la cantidad de canales.", 400);
  }
  if (new Set(body.orderedIds).size !== body.orderedIds.length) {
    return errorResponse("La lista de orden contiene canales duplicados.", 400);
  }
  const expected = new Set(channels.map((item: { id: string }) => item.id));
  if ([...body.orderedIds].some((id) => !expected.has(id))) {
    return errorResponse("La lista de orden contiene canales inválidos.", 400);
  }

  await prisma.$transaction(
    body.orderedIds.map((id, index) =>
      prisma.homepageChannel.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  await logAuditEvent({
    actor: { userId: auth.sessionUser.id, role: auth.sessionUser.role },
    action: "homepage.channels.reordered",
    resourceType: "homepage_channel",
    status: "success",
    metadata: { itemCount: body.orderedIds.length },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verify**

`npm run build && npm run typecheck && npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/homepage/channels
git commit -m "feat(api): add channels CRUD + reorder endpoints"
```

---

### Task 4: API — extend social-links with placements

**Files:**
- Modify: `app/api/admin/homepage/social-links/route.ts`
- Modify: `app/api/admin/homepage/social-links/[linkId]/route.ts`

**Interfaces:**
- Consumes: existing `socialLinkCreateSchema`/`socialLinkUpdateSchema`.
- Produces: both schemas gain `placements: z.array(z.enum(["INFOBAR","FLOATING","FOOTER","BOOKING"])).optional()` (create defaults to `[]` if omitted); `serializeSocialLink` includes `placements` in its output.

- [ ] **Step 1: Update `route.ts`**

In `socialLinkCreateSchema` (currently `href, label, iconKey, isActive`), add:
```ts
placements: z.array(z.enum(["INFOBAR", "FLOATING", "FOOTER", "BOOKING"])).default([]),
```
In `serializeSocialLink`, add `placements: link.placements,` to the returned object. Update the `SocialLinkRecord` type to include `placements: string[]`. In the `POST` handler's `prisma.homepageSocialLink.create({data: {...}})` call, add `placements: body.placements,`.

- [ ] **Step 2: Update `[linkId]/route.ts`**

Same additions: `placements` optional array in `socialLinkUpdateSchema`, added to `SocialLinkRecord` type and `serializeSocialLink`. No change needed to the `PATCH` handler body itself since it already spreads `body` directly into `prisma.homepageSocialLink.update({data: body})`.

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/homepage/social-links
git commit -m "feat(api): add placements field to social-links endpoints"
```

---

### Task 5: Pipeline — wire channels into homepage content

**Files:**
- Modify: `lib/marketing/homepage-types.ts`
- Modify: `lib/marketing/homepage-defaults.ts`
- Modify: `lib/marketing/homepage.ts`
- Modify: `lib/marketing/homepage-adapter.ts`

**Interfaces:**
- Consumes: `prisma.homepageChannel` (Task 1).
- Produces: `HomepageChannelContent = {type: "WHATSAPP"|"PHONE"|"EMAIL"; value: string; label: string; placements: string[]}`; `HomepageNormalizedContent.channels: HomepageChannelContent[]`; `HomepageSocialLinkContent` gains `placements: string[]`. Adapter exposes filtering helpers `filterByPlacement(items, placement)` used by Tasks 6-8.

- [ ] **Step 1: Add the type**

In `lib/marketing/homepage-types.ts`, add:
```ts
export type HomepageChannelContent = {
  type: "WHATSAPP" | "PHONE" | "EMAIL";
  value: string;
  label: string;
  placements: string[];
};
```
Add `placements: string[];` to `HomepageSocialLinkContent`. Add `channels: HomepageChannelContent[];` as a new top-level field on `HomepageNormalizedContent`, right before `hero:`.

- [ ] **Step 2: Add defaults**

In `lib/marketing/homepage-defaults.ts`, add `channels: []` to `HOMEPAGE_DEFAULT_CONTENT` (empty by default — the seed/bootstrap path for channels is the migration script from Task 2, not `bootstrapHomepageContent`, since channels didn't exist before this feature). Add `placements: ["INFOBAR", "FOOTER"]` to each existing social link entry in the defaults array (`infoBar.socials`).

- [ ] **Step 3: Fetch in `getHomepageContent`**

In `lib/marketing/homepage.ts`, add `prisma.homepageChannel.findMany({where: {isActive: true}, orderBy: {sortOrder: "asc"}})` to the `$transaction` array (same pattern as every prior task in this session that added a query here), destructure as `channels`, and add to the returned object:
```ts
    channels: channels.map((c) => ({ type: c.type, value: c.value, label: c.label, placements: c.placements })),
```
Update the `socials` mapping (both occurrences, `infoBar.socials` and `contact.socials`) to include `placements: social.placements` in the mapped object.

- [ ] **Step 4: Add filtering helper to the adapter**

In `lib/marketing/homepage-adapter.ts`, add:
```ts
export function filterByPlacement<T extends { placements: string[] }>(items: T[], placement: string): T[] {
  return items.filter((item) => item.placements.includes(placement));
}

export function buildWhatsappHref(value: string): string {
  return `https://wa.me/${value}`;
}

export function buildPhoneHref(value: string): string {
  return `tel:+${value}`;
}

export function buildEmailHref(value: string): string {
  return `mailto:${value}`;
}
```
These generalize the existing `normalizeWhatsappHref`/`normalizePhoneHref` helpers (already in this file) to work on `HomepageChannel.value` directly — keep the existing helpers if other code still references them, or replace their call sites in Tasks 6-8 with these new ones since they're now the single source of href-building logic for channels.

- [ ] **Step 5: Verify**

`npm run build && npm run typecheck && npm run lint`.

- [ ] **Step 6: Commit**

```bash
git add lib/marketing
git commit -m "feat(marketing): wire channels into homepage content pipeline"
```

---

### Task 6: Admin UI — AdminHomepageChannelsPanel + social-links placement checkboxes

**Files:**
- Create: `app/portal/admin/content/AdminHomepageChannelsPanel.tsx`
- Modify: `app/portal/admin/content/AdminHomepageSocialLinksPanel.tsx`

**Interfaces:**
- Consumes: Task 3's channels API, Task 4's extended social-links API.
- Produces: `AdminHomepageChannelsPanel` component (no props), used by Task 9's sidebar wiring.

- [ ] **Step 1: Create `AdminHomepageChannelsPanel.tsx`**

Mirror `AdminHomepageSocialLinksPanel.tsx`'s structure exactly (load/create/save/remove/reorder against `/api/admin/homepage/channels`), with these differences: `type` is a `<select>` (Whatsapp/Teléfono/Email) instead of an icon picker; `value` input shows a placeholder matching the selected type ("573237968435" for WhatsApp/Teléfono, "correo@dentpro.co" for Email); and a placements checkbox group renders in both the "Nuevo canal" form and each existing card's edit view:

```tsx
const PLACEMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "INFOBAR", label: "Barra superior" },
  { value: "FLOATING", label: "Botón flotante" },
  { value: "FOOTER", label: "Footer" },
  { value: "BOOKING", label: "Formulario de agenda" },
];

function PlacementCheckboxes({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {PLACEMENT_OPTIONS.map((option) => (
        <label key={option.value} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={value.includes(option.value)}
            onChange={(e) => {
              const next = e.target.checked
                ? [...value, option.value]
                : value.filter((v) => v !== option.value);
              onChange(next);
            }}
            disabled={disabled}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
```

Use `PlacementCheckboxes` in place of the icon-picker `<select>` that `AdminHomepageSocialLinksPanel.tsx` has for `iconKey` — everything else (load/create/save/remove/reorder handlers, `fetchWithRetry`/`fetchWithTimeout` calls against `/api/admin/homepage/channels`, `EMPTY_CHANNEL` state shape `{type: "WHATSAPP", value: "", label: "", placements: [], isActive: true}`, Card-per-item layout with Subir/Bajar/Editar/Eliminar) follows the exact same pattern as `AdminHomepageSocialLinksPanel.tsx`, adapted for the `ChannelPayload` shape from Task 3.

- [ ] **Step 2: Add placement checkboxes to `AdminHomepageSocialLinksPanel.tsx`**

Import the `PLACEMENT_OPTIONS`/`PlacementCheckboxes` helper (extract it to a shared file `app/portal/admin/content/components/PlacementCheckboxes.tsx` and import it into both this panel and the new Channels panel, rather than duplicating it — update Step 1 above to import from there instead of defining inline). Add a `PlacementCheckboxes` control to the "Nuevo enlace" form and each existing card's edit view, next to the existing icon `<select>`. Update `EMPTY_SOCIAL_LINK` to include `placements: []`. Update `saveSocialLink`'s PATCH body to include `placements: socialLink.placements`.

- [ ] **Step 3: Extract the shared component**

Create `app/portal/admin/content/components/PlacementCheckboxes.tsx` containing exactly the `PLACEMENT_OPTIONS` array and `PlacementCheckboxes` function from Step 1, exported. Update both panels to import from this file instead of defining locally.

- [ ] **Step 4: Verify**

`npm run build && npm run typecheck && npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add app/portal/admin/content/AdminHomepageChannelsPanel.tsx app/portal/admin/content/AdminHomepageSocialLinksPanel.tsx app/portal/admin/content/components/PlacementCheckboxes.tsx
git commit -m "feat(admin): add Canales panel and placement checkboxes to Redes sociales"
```

---

### Task 7: Admin UI — Información de empresa panel (datos generales)

**Files:**
- Create: `app/portal/admin/content/AdminCompanyInfoPanel.tsx`

**Interfaces:**
- Consumes: `GET`/`PATCH /api/admin/homepage/settings` (existing endpoint, Task 8 will trim its schema).
- Produces: `AdminCompanyInfoPanel` component (no props) covering `siteName`, `logoUrl`, `infoBarLocation`, `infoBarHours` — used by Task 9's sidebar wiring alongside the Channels/Redes panels under one "Información de empresa" section.

- [ ] **Step 1: Create the panel**

A single-form panel (not a CRUD list) following the same load/PATCH/feedback pattern as the existing `AdminHomepageSettingsPanel.tsx`, but scoped to only these 4 fields:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminImageField } from "@/app/portal/admin/content/components/AdminImageField";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type CompanyInfoForm = {
  siteName: string;
  logoUrl: string;
  infoBarLocation: string;
  infoBarHours: string;
};

const EMPTY_FORM: CompanyInfoForm = { siteName: "", logoUrl: "", infoBarLocation: "", infoBarHours: "" };

export function AdminCompanyInfoPanel() {
  const [form, setForm] = useState<CompanyInfoForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetchWithRetry("/api/admin/homepage/settings");
    const body = (await response.json().catch(() => null)) as { settings?: Partial<CompanyInfoForm> } | null;
    if (!response.ok || !body?.settings) {
      setError("No se pudo cargar la información de empresa.");
      setLoading(false);
      return;
    }
    setForm({
      siteName: body.settings.siteName ?? "",
      logoUrl: body.settings.logoUrl ?? "",
      infoBarLocation: body.settings.infoBarLocation ?? "",
      infoBarHours: body.settings.infoBarHours ?? "",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const response = await fetchWithTimeout("/api/admin/homepage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = (await response.json().catch(() => null)) as { error?: string; details?: Array<{ message: string }> } | null;
    if (!response.ok) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudieron guardar los cambios.");
      setSaving(false);
      return;
    }
    setSuccess("Información de empresa actualizada.");
    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">Cargando información de empresa...</p>;
  }

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Información de empresa</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Nombre, logo, dirección y horario — se muestran automáticamente en el sitio donde ya aparecen hoy.</p>
      </section>

      <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nombre de la empresa</span>
          <input className="input h-11 text-sm" value={form.siteName} onChange={(e) => setForm((p) => ({ ...p, siteName: e.target.value }))} disabled={saving} />
        </label>
        <AdminImageField
          label="Logo"
          value={form.logoUrl}
          onChange={(value) => setForm((p) => ({ ...p, logoUrl: value }))}
          uploadFolder="marketing/homepage/testimonial"
          recommendation="200×200 px mínimo"
          aspectRatio="1:1"
          placeholder="https://..."
          disabled={saving}
        />
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dirección</span>
          <input className="input h-11 text-sm" placeholder="Cra. 7 #13-180, Chía" value={form.infoBarLocation} onChange={(e) => setForm((p) => ({ ...p, infoBarLocation: e.target.value }))} disabled={saving} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Horario</span>
          <input className="input h-11 text-sm" placeholder="Lun–Sáb 8:00-19:00" value={form.infoBarHours} onChange={(e) => setForm((p) => ({ ...p, infoBarHours: e.target.value }))} disabled={saving} />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

      <button
        type="button"
        className="rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => void onSave()}
        disabled={saving}
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
```

Note: `infoBarLocation` writes to both `infoBarLocation` and `contactAddress` simultaneously per the approved design's note on avoiding drift — this happens server-side in Task 8's schema simplification, not in this panel's payload (the panel sends `infoBarLocation`; the API maps it to both columns).

- [ ] **Step 2: Verify**

`npm run build && npm run typecheck && npm run lint`.

- [ ] **Step 3: Commit**

```bash
git add app/portal/admin/content/AdminCompanyInfoPanel.tsx
git commit -m "feat(admin): add Información de empresa panel (datos generales)"
```

---

### Task 8: API — simplify settings schema, dual-write address

**Files:**
- Modify: `app/api/admin/homepage/settings/route.ts`

**Interfaces:**
- Consumes: existing `homepageSettingsSchema`.
- Produces: `homepageSettingsPatchSchema` accepts `infoBarLocation` and internally writes it to both `infoBarLocation` and `contactAddress` columns; the WhatsApp/phone/email/`floatingWhatsappNumber`/`floatingPhoneNumber` fields are removed from the schema (superseded by `HomepageChannel`).

- [ ] **Step 1: Remove obsolete fields from the schema and serializer**

In `homepageSettingsSchema` (`route.ts:84-148`), remove: `infoBarWhatsappHref`, `infoBarWhatsappLabel`, `infoBarEmailHref`, `infoBarEmailLabel`, `contactPhone`, `contactWhatsapp`, `contactEmail`, `floatingWhatsappNumber`, `floatingPhoneNumber`. Remove the same keys from `serializeSettings` and `mapPayloadToUpdateData`, and from the `PATCH` handler's `select` block.

- [ ] **Step 2: Dual-write `infoBarLocation` to `contactAddress`**

In `mapPayloadToUpdateData`, change:
```ts
    infoBarLocation: payload.infoBarLocation,
```
to:
```ts
    infoBarLocation: payload.infoBarLocation,
    contactAddress: payload.infoBarLocation !== undefined ? payload.infoBarLocation : undefined,
```
This makes `AdminCompanyInfoPanel`'s single "Dirección" field keep both columns in sync without the admin ever seeing `contactAddress` as a separate field. `contactAddress` is removed from `homepageSettingsSchema`'s input fields (Step 1 covers `contactPhone`/`contactWhatsapp`/`contactEmail` but `contactAddress` itself is retained as an internal-only write target, not admin input — leave it out of the schema's public field list, add it only in `mapPayloadToUpdateData` as shown above).

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/homepage/settings/route.ts
git commit -m "feat(api): remove channel fields from settings schema, dual-write address"
```

---

### Task 9: Public — InfoBar + FloatingActions consume unified channels

**Files:**
- Modify: `app/(marketing)/components/InfoBar.tsx`
- Modify: `app/(marketing)/components/FloatingActions.tsx`
- Modify: `app/page.tsx`
- Modify: `lib/marketing/homepage-adapter.ts`

**Interfaces:**
- Consumes: `homepageContent.channels`, `homepageContent.infoBar.socials` (with `placements`), `filterByPlacement`/`buildWhatsappHref`/`buildPhoneHref`/`buildEmailHref` from Task 5.
- Produces: `InfoBar` and `FloatingActions` no longer receive `whatsapp`/`email`/`whatsappNumber`/`phoneNumber` as dedicated props — they receive `channels: HomepageChannelContent[]` and `socials: HomepageSocialLinkContent[]` (already filtered to the right placement by the caller).

- [ ] **Step 1: Update `adaptHomepageContent` in `homepage-adapter.ts`**

Replace the `infoBar` object's `whatsapp`/`email` construction with:
```ts
    infoBar: {
      location: content.infoBar.location,
      schedule: content.infoBar.schedule,
      channels: filterByPlacement(content.channels, "INFOBAR"),
      socials: filterByPlacement(content.infoBar.socials, "INFOBAR"),
    },
```
Replace `floatingActions` entirely:
```ts
    floatingActions: {
      channels: filterByPlacement(content.channels, "FLOATING"),
      socials: filterByPlacement(content.infoBar.socials, "FLOATING"),
    },
```
Update `HomepageViewModel`'s type accordingly (remove old `whatsapp`/`email` fields from `infoBar`, remove `whatsappNumber`/`phoneNumber` from `floatingActions`, add `channels`/`socials` arrays to both).

- [ ] **Step 2: Rewrite `InfoBar.tsx`'s channel/email rendering**

Replace the fixed WhatsApp-link and Email-link JSX with a loop over `channels`, building the href per `type` (`buildWhatsappHref`/`buildPhoneHref`/`buildEmailHref` from the adapter) and rendering icon-only for all three (matching the approved design's "email podría ser solo un ícono" decision — WhatsApp/Teléfono/Email all render as icon-only links in InfoBar now, consistent with the social icons already there). Icon per type: WhatsApp → `ChatCircleDots`, Phone → `Phone`, Email → `EnvelopeSimple` (already imported via `@/components/ui/Icon` elsewhere in this codebase). Render `socials` exactly as `InfoBar.tsx` already does today (unchanged — it already receives a `socials` array).

- [ ] **Step 3: Rewrite `FloatingActions.tsx`**

Replace the fixed 3-button JSX (WhatsApp, Phone, "Ir a agenda") with: a loop over `channels` (WhatsApp/Phone/Email, each rendering its own floating button with the icon matching its type) + a loop over `socials` (rendering a floating button per active social with `FLOATING` placement) + the existing hardcoded "Ir a agenda" button unchanged (out of scope per the design). No cap on the combined count — admin's responsibility.

- [ ] **Step 4: Update `app/page.tsx`**

`marketingContent.infoBar` and `marketingContent.floatingActions` already flow through unchanged (`<InfoBar {...marketingContent.infoBar} .../>`, `<FloatingActions {...marketingContent.floatingActions} />`) — no changes needed here beyond what Step 1's adapter change already produces, since the spread continues to work with the new shape.

- [ ] **Step 5: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually load the homepage (dev server) and confirm InfoBar/floating buttons render with the migrated data from Task 2.

- [ ] **Step 6: Commit**

```bash
git add app/\(marketing\)/components/InfoBar.tsx app/\(marketing\)/components/FloatingActions.tsx lib/marketing/homepage-adapter.ts
git commit -m "feat(marketing): InfoBar and FloatingActions consume unified channels"
```

---

### Task 10: Public — ContactSection + BookingForm consume unified channels

**Files:**
- Modify: `app/(marketing)/components/ContactSection.tsx`
- Modify: `app/(marketing)/components/BookingForm.tsx`
- Modify: `lib/marketing/homepage-adapter.ts`

**Interfaces:**
- Consumes: same `filterByPlacement`/`buildXHref` helpers as Task 9, filtered to `FOOTER`/`BOOKING`.

- [ ] **Step 1: Update the adapter**

In `adaptHomepageContent`, change `contact.channels` construction from the current hardcoded 4-entry array (Teléfono/WhatsApp/Email/Ubicación built from `settings.contactPhone` etc., now removed in Task 8) to:
```ts
    contact: {
      // ...existing title/description/supportTitle/etc unchanged...
      channels: filterByPlacement(content.channels, "FOOTER"),
      socials: filterByPlacement(content.infoBar.socials, "FOOTER"),
      // ...rest unchanged...
    },
```
Note: the "Ubicación" entry (address, no channel type) is no longer part of `channels` — it moves to being rendered directly from `contact.title`/company info in `ContactSection.tsx` if still desired there, or dropped from this specific list since address is already visible in "Sedes/ubicaciones" and the map embed. Decide in Step 2 based on what reads best; either keep a static "Ubicación" line sourced from `homepageContent` company info (not from `channels`, since address isn't a channel type) or remove it from this list — both are minor presentational calls, not architectural ones.

Add a new adapter export for BookingForm's card:
```ts
export function buildBookingChannels(content: HomepageNormalizedContent) {
  return {
    channels: filterByPlacement(content.channels, "BOOKING"),
    socials: filterByPlacement(content.infoBar.socials, "BOOKING"),
  };
}
```

- [ ] **Step 2: Update `ContactSection.tsx`**

Replace the fixed 4-channel rendering loop with one over the new `channels` array (same icon-per-type mapping as Task 9), preserving the existing card/column layout. Keep `socials` rendering as-is (already an array-based loop today).

- [ ] **Step 3: Update `BookingForm.tsx`**

In the "¿Tienes dudas?" card, replace the hardcoded `https://wa.me/573237968435`/`tel:+573237968435` literals with a loop over `buildBookingChannels(homepageContent).channels` (passed as a new prop `bookingChannels`/`bookingSocials` from `app/page.tsx`, since `BookingFormSection` currently receives `{...marketingContent.booking}` — add `channels`/`socials` to that spread in `app/page.tsx` by calling `buildBookingChannels(homepageContent)` and merging into the props passed to `<BookingFormSection>`).

- [ ] **Step 4: Update `app/page.tsx`**

```tsx
const bookingChannels = buildBookingChannels(homepageContent);
// ...
<BookingFormSection {...marketingContent.booking} {...bookingChannels} />
```
Import `buildBookingChannels` from `@/lib/marketing/homepage-adapter`.

- [ ] **Step 5: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually confirm the footer and booking card render channels correctly.

- [ ] **Step 6: Commit**

```bash
git add app/\(marketing\)/components/ContactSection.tsx app/\(marketing\)/components/BookingForm.tsx app/page.tsx lib/marketing/homepage-adapter.ts
git commit -m "feat(marketing): ContactSection and BookingForm consume unified channels"
```

---

### Task 11: Public — JSON-LD reads from unified channels

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `homepageContent.channels`, `homepageContent.infoBar.socials`.

- [ ] **Step 1: Replace hardcoded JSON-LD fields**

In the `jsonLd` object construction, replace:
```ts
telephone: homepageContent.contact.channels[0]?.value ?? "+573237968435",
email: homepageContent.contact.channels[2]?.value ?? "dentprocolombia@gmail.com",
```
with lookups against `homepageContent.channels` (unfiltered by placement — JSON-LD is global metadata, not a visual placement):
```ts
telephone: homepageContent.channels.find((c) => c.type === "PHONE")?.value ?? "573237968435",
email: homepageContent.channels.find((c) => c.type === "EMAIL")?.value ?? "dentprocolombia@gmail.com",
```
Replace the hardcoded `sameAs` array with:
```ts
sameAs: homepageContent.infoBar.socials.map((s) => s.href),
```
`address`, `geo`, `openingHoursSpecification`, `priceRange` stay hardcoded — explicitly out of scope per the approved design (they're not channels or social links).

- [ ] **Step 2: Verify**

`npm run build && npm run typecheck && npm run lint`. Confirm the JSON-LD script tag still produces valid schema.org markup (no undefined values breaking the JSON).

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(marketing): JSON-LD reads telephone/email/sameAs from unified channels"
```

---

### Task 12: Cleanup — remove obsolete settings sections from the giant form, add slugs for new panels

**Files:**
- Modify: `app/portal/admin/content/AdminHomepageSettingsPanel.tsx`

**Interfaces:**
- Produces: `SECTIONS` array loses the `info-superior` and `acciones-flotantes` entries entirely (their fields are gone from the API per Task 8, and their content now lives in `AdminCompanyInfoPanel`/`AdminHomepageChannelsPanel`).

- [ ] **Step 1: Remove the two obsolete sections**

Delete the `info-superior` (`Información superior`) and `acciones-flotantes` (`Acciones flotantes`) entries from the `SECTIONS` array in `AdminHomepageSettingsPanel.tsx`, along with their field definitions. This is a pure removal — Task 19 will further split this file's remaining sections into independent panels, so leave the rest of the structure intact for now; this task only removes what Task 8's API already dropped.

- [ ] **Step 2: Verify**

`npm run build && npm run typecheck && npm run lint`. Confirm the panel no longer renders the two removed sections and doesn't error trying to read now-nonexistent settings fields.

- [ ] **Step 3: Commit**

```bash
git add app/portal/admin/content/AdminHomepageSettingsPanel.tsx
git commit -m "chore(admin): remove obsolete Barra superior and Acciones flotantes sections"
```

---

# Part 2 — Fusión Especialistas → Staff

*(implements Section A of `docs/archive/specs/2026-08-20-admin-content-cms-restructure-design.md`)*

### Task 13: Prisma — additive homepage columns on ProfessionalProfile

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `ProfessionalProfile` gains `homepageBioShort String?`, `homepageImageUrl String?`, `homepageImageAlt String?`, `showOnHomepage Boolean @default(false)`, `homepageSortOrder Int @default(0)`. No other field/relation on this model changes.

- [ ] **Step 1: Add the columns**

In `prisma/schema.prisma`, find `model ProfessionalProfile` (currently ~line 212) and add after `active`:
```prisma
  homepageBioShort      String?
  homepageImageUrl      String?
  homepageImageAlt      String?
  showOnHomepage        Boolean                          @default(false)
  homepageSortOrder     Int                              @default(0)
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npx prisma migrate dev --name add_professional_homepage_fields
```
(Same shadow-DB fallback note as Task 1 if needed.)

- [ ] **Step 3: Verify**

`npx prisma validate && npm run typecheck`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add additive homepage columns to ProfessionalProfile"
```

---

### Task 14: Data migration — Especialistas → ProfessionalProfile

**Files:**
- Create: `scripts/migrate-homepage-specialists.mjs` (one-off, deleted after running)

**Interfaces:**
- Consumes: `prisma.homepageSpecialist`, `prisma.professionalProfile` (joined to `prisma.user`).
- Produces: updates matching `ProfessionalProfile` rows' new homepage columns; prints a report of unmatched `HomepageSpecialist` rows for manual review.

- [ ] **Step 1: Write the migration script**

```js
// scripts/migrate-homepage-specialists.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const specialists = await prisma.homepageSpecialist.findMany({ where: { isActive: true } });
const professionals = await prisma.professionalProfile.findMany({ include: { user: true } });

function normalize(s) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

let matched = 0;
const unmatched = [];

for (const specialist of specialists) {
  const target = normalize(specialist.fullName);
  const match = professionals.find((p) => normalize(`${p.user.name} ${p.user.lastName}`) === target);

  if (!match) {
    unmatched.push(specialist.fullName);
    continue;
  }

  await prisma.professionalProfile.update({
    where: { id: match.id },
    data: {
      homepageBioShort: specialist.bioShort,
      homepageImageUrl: specialist.imageUrl,
      homepageImageAlt: specialist.altText,
      showOnHomepage: true,
      homepageSortOrder: specialist.sortOrder,
    },
  });
  matched++;
}

console.log(`Matched and migrated ${matched} of ${specialists.length} specialists.`);
if (unmatched.length > 0) {
  console.log("UNMATCHED (review manually, activate showOnHomepage by hand in Staff):");
  for (const name of unmatched) console.log(` - ${name}`);
}

await prisma.$disconnect();
await pool.end();
```

- [ ] **Step 2: Run it and record the output**

```bash
node --env-file=.env.local scripts/migrate-homepage-specialists.mjs
```
Keep the printed unmatched list in your task report for the reviewer/user — those specialists need manual activation in Staff after this ships.

- [ ] **Step 3: Delete the script**

```bash
rm scripts/migrate-homepage-specialists.mjs
```

- [ ] **Step 4: Commit**

Nothing to commit (script deleted, this is a data-only operation) — report the match/unmatched counts in your task report.

---

### Task 15: Admin UI — Staff professional form gains "Presencia en el sitio público"

**Files:**
- Modify: `app/portal/admin/professionals/AdminProfessionalsPanel.tsx` (or wherever the actual professional-edit form lives — confirmed in prior work this session to route through `AdminUsersPanel`/`RoleModal`; read the current file first to find the exact edit surface, since professional-specific fields beyond role+specialty aren't yet in `RoleModal.tsx` as built earlier this session)

**Interfaces:**
- Consumes: a new PATCH surface for `ProfessionalProfile`'s homepage fields.
- Produces: a new API route `app/api/admin/professionals/[id]/homepage/route.ts` (`PATCH`) if no existing endpoint already supports patching `ProfessionalProfile` fields beyond specialty/slotDuration; check `app/api/users/[id]/route.ts` first (already read in full earlier this session — its `updateUserSchema` does not include these new fields) before deciding whether to extend that route or add a new one. Prefer extending `app/api/users/[id]/route.ts`'s `updateUserSchema`/`PATCH` handler with the 5 new optional fields (`homepageBioShort`, `homepageImageUrl`, `homepageImageAlt`, `showOnHomepage`, `homepageSortOrder`), mapped into the existing `professional.update({data: {...}})` call when `targetRole === "PROFESIONAL"` — this keeps one PATCH surface for professional data instead of creating a second one.

- [ ] **Step 1: Read the current professional edit UI**

Read `app/portal/admin/users/RoleModal.tsx` and `app/api/users/[id]/route.ts` in full (both already built/reviewed earlier this session) to confirm the exact insertion points before writing code — this task's implementer must not guess file structure that may have shifted.

- [ ] **Step 2: Extend `updateUserSchema` in `app/api/users/[id]/route.ts`**

Add optional fields:
```ts
  homepageBioShort: z.string().trim().max(600).optional(),
  homepageImageUrl: z.string().trim().max(524288).optional(),
  homepageImageAlt: z.string().trim().max(180).optional(),
  showOnHomepage: z.boolean().optional(),
  homepageSortOrder: z.number().int().min(0).optional(),
```
In the `targetRole === "PROFESIONAL"` branch's `professionalProfile.update`/`create` calls, pass these through when present in `payload`.

- [ ] **Step 3: Add a "Presencia en el sitio público" section to `RoleModal.tsx`**

Inside the `role === "PROFESIONAL"` branch, after the "Servicios que ofrece" section (built earlier this session), add a new section with: bio corta (textarea), imagen (reuse `AdminImageField`), toggle `showOnHomepage`, and an order number input — following the same `useState`/PATCH-on-save pattern already established in this file for the Rol+Especialidad section. This section is independently saveable (its own small "Guardar" button + status feedback), consistent with this file's existing per-section save pattern.

- [ ] **Step 4: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually confirm a professional's homepage fields save and persist.

- [ ] **Step 5: Commit**

```bash
git add app/api/users/[id]/route.ts app/portal/admin/users/RoleModal.tsx
git commit -m "feat(admin): add homepage presence fields to professional edit form"
```

---

### Task 16: Public — SpecialistsSlider reads from ProfessionalProfile; remove old panel/table/API

**Files:**
- Modify: `lib/marketing/homepage.ts`
- Modify: `lib/marketing/homepage-types.ts`
- Delete: `app/portal/admin/content/AdminHomepageSpecialistsPanel.tsx`
- Delete: `app/api/admin/homepage/specialists/` (entire directory)
- Modify: `prisma/schema.prisma` (drop `HomepageSpecialist`)

**Interfaces:**
- Produces: `getHomepageContent()`'s `specialists.specialists[]` is built from `prisma.professionalProfile.findMany({where: {showOnHomepage: true, active: true}, include: {user: true}, orderBy: {homepageSortOrder: "asc"}})` instead of `prisma.homepageSpecialist.findMany(...)`.

- [ ] **Step 1: Update `getHomepageContent` in `homepage.ts`**

Replace the `prisma.homepageSpecialist.findMany(...)` call in the `$transaction` array with:
```ts
    prisma.professionalProfile.findMany({
      where: { showOnHomepage: true, active: true },
      include: { user: true, specialty: true },
      orderBy: { homepageSortOrder: "asc" },
    }),
```
Update the destructured variable name and the `specialists` mapping in the returned object:
```ts
    specialists: {
      badge: settings?.specialistsBadge ?? fallback.specialists.badge,
      title: settings?.specialistsTitle ?? fallback.specialists.title,
      description: settings?.specialistsDescription ?? fallback.specialists.description,
      specialists: professionals.map((p) => ({
        name: `${p.user.name} ${p.user.lastName}`,
        specialty: p.specialty.name,
        description: p.homepageBioShort ?? "",
        image: { src: p.homepageImageUrl ?? "", alt: p.homepageImageAlt ?? `${p.user.name} ${p.user.lastName}` },
      })),
    },
```
No `fallback.specialists.specialists` default branch is needed anymore — an empty array (no professionals marked `showOnHomepage`) is valid and `SpecialistsSlider` already handles `showSpecialists`-driven visibility via `homepageContent.showSpecialists` unchanged elsewhere in `app/page.tsx`.

- [ ] **Step 2: Delete the old panel and API**

```bash
git rm -r app/portal/admin/content/AdminHomepageSpecialistsPanel.tsx app/api/admin/homepage/specialists
```

- [ ] **Step 3: Drop `HomepageSpecialist` from the schema**

Remove `model HomepageSpecialist { ... }` from `prisma/schema.prisma`. Run:
```bash
npx prisma migrate dev --name drop_homepage_specialist
```

- [ ] **Step 4: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually confirm the Especialistas slider on the public homepage shows the migrated professionals from Task 14.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(marketing): SpecialistsSlider reads from ProfessionalProfile, remove HomepageSpecialist"
```

---

# Part 3 — Fusión Servicios → Service clínico

*(implements Section B of `docs/archive/specs/2026-08-20-admin-content-cms-restructure-design.md`)*

### Task 17: Prisma — additive homepage columns on Service + ServiceHighlight model

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Service` gains `iconKey String?`, `showOnHomepage Boolean @default(false)`, `homepageSortOrder Int @default(0)`, relation `homepageHighlights ServiceHighlight[]`. New model `ServiceHighlight`. No other field/relation on `Service` changes.

- [ ] **Step 1: Add the columns and model**

In `prisma/schema.prisma`, find `model Service` (currently ~line 258) and add after `active`:
```prisma
  iconKey            String?
  showOnHomepage     Boolean            @default(false)
  homepageSortOrder  Int                @default(0)
  homepageHighlights ServiceHighlight[]
```
Add a new model after `Service`'s closing brace:
```prisma
model ServiceHighlight {
  id        String   @id @default(uuid())
  serviceId String
  service   Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  text      String
  sortOrder Int      @default(0)

  @@index([serviceId, sortOrder])
}
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npx prisma migrate dev --name add_service_homepage_fields
```

- [ ] **Step 3: Verify**

`npx prisma validate && npm run typecheck`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add additive homepage columns and ServiceHighlight to Service"
```

---

### Task 18: Data migration — HomepageService → Service

**Files:**
- Create: `scripts/migrate-homepage-services.mjs` (one-off, deleted after running)

**Interfaces:**
- Consumes: `prisma.homepageService` (with `highlights`), `prisma.service`.
- Produces: updates matching `Service` rows' new homepage columns and creates `ServiceHighlight` rows; prints unmatched report.

- [ ] **Step 1: Write the migration script**

```js
// scripts/migrate-homepage-services.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function normalize(s) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

const homepageServices = await prisma.homepageService.findMany({
  where: { isActive: true },
  include: { highlights: { orderBy: { sortOrder: "asc" } } },
});
const clinicServices = await prisma.service.findMany();

let matched = 0;
const unmatched = [];

for (const hs of homepageServices) {
  const target = normalize(hs.title);
  const match = clinicServices.find((s) => normalize(s.name) === target);

  if (!match) {
    unmatched.push(hs.title);
    continue;
  }

  await prisma.service.update({
    where: { id: match.id },
    data: {
      iconKey: hs.iconKey,
      showOnHomepage: true,
      homepageSortOrder: hs.sortOrder,
      homepageHighlights: {
        create: hs.highlights.map((h) => ({ text: h.text, sortOrder: h.sortOrder })),
      },
    },
  });
  matched++;
}

console.log(`Matched and migrated ${matched} of ${homepageServices.length} services.`);
if (unmatched.length > 0) {
  console.log("UNMATCHED (review manually, activate showOnHomepage by hand in admin/services):");
  for (const title of unmatched) console.log(` - ${title}`);
}

await prisma.$disconnect();
await pool.end();
```

- [ ] **Step 2: Run it and record the output**

```bash
node --env-file=.env.local scripts/migrate-homepage-services.mjs
```

- [ ] **Step 3: Delete the script**

```bash
rm scripts/migrate-homepage-services.mjs
```

- [ ] **Step 4: Commit**

Nothing to commit — report match/unmatched counts in your task report.

---

### Task 19: Admin UI — admin/services gains "Presencia en el sitio público"

**Files:**
- Modify: `app/portal/admin/services/AdminServicesPanel.tsx`
- Modify: `app/api/services/route.ts`
- Modify: `app/api/services/[id]/route.ts`

**Interfaces:**
- Consumes: `MARKETING_ICON_KEYS` from `@/lib/marketing/homepage-types` (already used elsewhere in this codebase for icon pickers).
- Produces: `ServiceModal` (the create/edit form already in `AdminServicesPanel.tsx`) gains icon picker, `showOnHomepage` toggle, order field, and a highlights sub-CRUD; `/api/services` POST and `/api/services/[id]` PATCH accept `iconKey`, `showOnHomepage`, `homepageSortOrder`.

- [ ] **Step 1: Extend the API schemas**

In `app/api/services/route.ts`'s `serviceSchema`, add:
```ts
  iconKey: z.enum(MARKETING_ICON_KEYS).nullable().optional(),
  showOnHomepage: z.boolean().optional(),
  homepageSortOrder: z.number().int().min(0).optional(),
```
Import `MARKETING_ICON_KEYS` from `@/lib/marketing/homepage-types`. Add the same fields to `app/api/services/[id]/route.ts`'s update schema (read that file first — it wasn't fully read in this session's research; follow its existing `serviceSchema`-equivalent pattern for consistency). Add matching create-highlights sub-routes mirroring `app/api/admin/homepage/services/[serviceId]/highlights/*` (already read in full earlier via `AdminHomepageServicesPanel.tsx`'s consumption of `/api/admin/homepage/services/${serviceId}/highlights`) but re-pointed at `/api/services/[id]/highlights` and the new `ServiceHighlight` model (`serviceId` field instead of `homepageServiceId`).

- [ ] **Step 2: Add the fields to `ServiceModal` in `AdminServicesPanel.tsx`**

Add to `ServiceForm` type and `emptyForm`: `iconKey: string`, `showOnHomepage: boolean`, `homepageSortOrder: string`. Add form controls inside `ServiceModal`'s grid: an icon `<select>` (same `MARKETING_ICON_KEYS` list already used in `AdminHomepageServicesPanel.tsx`), a `showOnHomepage` checkbox labeled "Mostrar en el sitio público", and a sort-order number input. Wire into `createService`/`updateService`'s request bodies.

- [ ] **Step 3: Add a highlights sub-CRUD**

Below the main service list (or inside each row's expanded edit view), add the same highlights create/edit/delete/reorder UI already built in `AdminHomepageServicesPanel.tsx` (Step-for-step port: `createHighlight`/`updateHighlight`/`deleteHighlight`/`reorderHighlights` functions, re-pointed at `/api/services/${serviceId}/highlights` instead of `/api/admin/homepage/services/${serviceId}/highlights`), gated behind `showOnHomepage` being true for that service (only show highlights management when the service is actually going to appear on the homepage).

- [ ] **Step 4: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually create/edit a service with homepage fields, add a highlight, confirm persistence.

- [ ] **Step 5: Commit**

```bash
git add app/portal/admin/services app/api/services
git commit -m "feat(admin): add homepage presence fields and highlights to Servicios y tarifas"
```

---

### Task 20: Public — ServicesSection reads from Service; remove old panel/tables/API

**Files:**
- Modify: `lib/marketing/homepage.ts`
- Modify: `app/(marketing)/components/Services.tsx`
- Delete: `app/portal/admin/content/AdminHomepageServicesPanel.tsx`
- Delete: `app/api/admin/homepage/services/` (entire directory)
- Modify: `prisma/schema.prisma` (drop `HomepageService`/`HomepageServiceHighlight`)

**Interfaces:**
- Produces: `getHomepageContent()`'s `services.services[]` is built from `prisma.service.findMany({where: {showOnHomepage: true, active: true}, include: {homepageHighlights: true}})`.

- [ ] **Step 1: Update `getHomepageContent` in `homepage.ts`**

Replace the `prisma.homepageService.findMany(...)` call with:
```ts
    prisma.service.findMany({
      where: { showOnHomepage: true, active: true },
      include: { homepageHighlights: { orderBy: { sortOrder: "asc" } } },
      orderBy: { homepageSortOrder: "asc" },
    }),
```
Update the `services` mapping:
```ts
    services: {
      title: settings?.servicesTitle ?? fallback.services.title,
      description: settings?.servicesDescription ?? fallback.services.description,
      services: services.map((s) => ({
        title: s.name,
        description: s.description ?? "",
        icon: sanitizeMarketingIcon(s.iconKey, "Sparkle"),
        highlights: s.homepageHighlights.map((h) => h.text),
      })),
    },
```

- [ ] **Step 2: Fix `SERVICE_HREFS` to use `id` instead of title matching**

In `Services.tsx`, `ServiceItem` gains an `id: string` field (already available on `s.id` from the query — thread it through the mapping in Step 1: add `id: s.id,` to the mapped object). Replace `SERVICE_HREFS` (title-keyed) with a route derived from `id` — since actual per-service detail routes (`/servicios/limpieza-dental` etc.) are hardcoded elsewhere in the app and don't currently key by ID, the safe minimal fix here is: keep `SERVICE_HREFS` as a fallback lookup by title (unchanged behavior) but don't treat this as blocking — this was flagged as an "incidental improvement, not bloqueante" in the approved design. Leave `SERVICE_HREFS` as-is in this task; do not attempt the ID-based rewrite (out of scope, avoids scope creep beyond what was approved).

- [ ] **Step 3: Delete the old panel and API**

```bash
git rm -r app/portal/admin/content/AdminHomepageServicesPanel.tsx app/api/admin/homepage/services
```

- [ ] **Step 4: Drop old models from the schema**

Remove `model HomepageService { ... }` and `model HomepageServiceHighlight { ... }` from `prisma/schema.prisma`. Run:
```bash
npx prisma migrate dev --name drop_homepage_service
```

- [ ] **Step 5: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually confirm the Servicios grid on the public homepage shows the migrated services from Task 18.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(marketing): ServicesSection reads from Service, remove HomepageService"
```

---

# Part 4 — Partir el formulario gigante y estructura final del sidebar

*(implements Section C/D/E of `docs/archive/specs/2026-08-20-admin-content-cms-restructure-design.md`)*

### Task 21: Split AdminHomepageSettingsPanel into 5 independent panels

**Files:**
- Create: `app/portal/admin/content/AdminHeroPanel.tsx`
- Create: `app/portal/admin/content/AdminServicesCopyPanel.tsx`
- Create: `app/portal/admin/content/AdminAgendaCopyPanel.tsx`
- Create: `app/portal/admin/content/AdminContactCopyPanel.tsx`
- Create: `app/portal/admin/content/AdminSeoPanel.tsx`
- Delete: `app/portal/admin/content/AdminHomepageSettingsPanel.tsx`

**Interfaces:**
- Consumes: `GET`/`PATCH /api/admin/homepage/settings` (each panel PATCHes only its own field subset — the endpoint already supports partial payloads via `.partial()`, no API change needed).
- Produces: five components, each following the exact same load/edit/PATCH/feedback pattern as `AdminCompanyInfoPanel` (Task 7), each scoped to one field group from the table in the design doc's Section C.

- [ ] **Step 1: Create `AdminHeroPanel.tsx`**

Same structural pattern as `AdminCompanyInfoPanel.tsx` (Task 7), scoped to: `heroBadge, heroTitle, heroDescription, heroPrimaryButtonText, heroPrimaryButtonHref, heroSecondaryButtonText, heroSecondaryButtonHref, heroImageUrl, heroImageAlt, heroTestimonialQuote, heroTestimonialAuthor, heroTestimonialRole, heroTestimonialAvatarUrl, heroHighlightTitle, heroHighlightDescription` — the exact 14 fields already defined in the (soon-deleted) `AdminHomepageSettingsPanel.tsx`'s `hero` section (`heroImageUrl`/`heroTestimonialAvatarUrl` use `AdminImageField` exactly as that file already does). Title: "Hero principal". Description: "Título, descripción, botones, testimonio e imagen principal del hero."

- [ ] **Step 2: Create `AdminServicesCopyPanel.tsx`**

Scoped to `servicesTitle, servicesDescription` only (2 fields). Title: "Encabezado de servicios". Description: "Título y descripción de la sección '¿Qué hacemos?'. El catálogo de servicios en sí se edita en Servicios y tarifas."

- [ ] **Step 3: Create `AdminAgendaCopyPanel.tsx`**

Scoped to `bookingTitle, bookingDescription, bookingBenefitsTitle, bookingScheduleNote, bookingConsentNote` (5 fields — `bookingSelectLabel` is dead per the prior audit and stays in the schema/DB but is omitted from this new panel's form, since exposing an editable field with zero rendering effect would recreate the exact confusion this restructure is meant to eliminate; it remains fixable in a future pass per the audit's own scoping). Title: "Agenda". Description: "Textos de apoyo del bloque de agendamiento."

- [ ] **Step 4: Create `AdminContactCopyPanel.tsx`**

Scoped to `contactTitle, contactDescription, contactSupportTitle, contactLocationsTitle, contactBrand, contactMapEmbedUrl` (6 fields). Title: "Contacto". Description: "Encabezados y textos del bloque de contacto."

- [ ] **Step 5: Create `AdminSeoPanel.tsx`**

Scoped to `metaTitle, metaDescription` (2 fields, both with the character-limit helper text already present in `AdminHomepageSettingsPanel.tsx`'s SEO section). Title: "SEO y metadatos". Description: "Controla cómo aparece el sitio en Google y en los resultados de búsqueda."

- [ ] **Step 6: Delete the old giant panel**

```bash
git rm app/portal/admin/content/AdminHomepageSettingsPanel.tsx
```

- [ ] **Step 7: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually confirm each new panel loads its own fields correctly and saves independently (edit Hero, confirm SEO's fields are untouched and vice versa).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(admin): split giant settings form into 5 independent panels"
```

---

### Task 22: Final ContentShell/ContentSidebar structure

**Files:**
- Modify: `app/portal/admin/content/ContentShell.tsx`
- Modify: `app/portal/admin/content/ContentSidebar.tsx`

**Interfaces:**
- Produces: final sidebar with one entry per real editable component — no deep-links to a shared form, no orphaned settings.

- [ ] **Step 1: Rewrite `ContentSidebar.tsx`'s `GROUPS`**

Replace the entire `GROUPS` array with:
```tsx
const GROUPS: SidebarGroup[] = [
  {
    label: "Información de empresa",
    items: [
      { slug: "company-info", label: "Datos generales", description: "Nombre, logo, dirección y horario." },
      { slug: "channels", label: "Canales de comunicación", description: "WhatsApp, teléfono y email — decide en qué lugares del sitio aparece cada uno." },
      { slug: "social", label: "Redes sociales", description: "Instagram, Facebook, etc. — decide en qué lugares del sitio aparece cada una." },
    ],
  },
  {
    label: "Hero",
    items: [
      { slug: "hero", label: "Hero principal", description: "Título, descripción, botones, testimonio e imagen principal." },
      { slug: "hero-stats", label: "Estadísticas hero", description: "Contadores debajo de los botones principales." },
    ],
  },
  {
    label: "Servicios",
    items: [
      { slug: "services-copy", label: "Encabezado de servicios", description: "Título y descripción de la sección '¿Qué hacemos?'." },
    ],
  },
  {
    label: "Agenda",
    items: [
      { slug: "agenda-copy", label: "Agenda", description: "Textos de apoyo del bloque de agendamiento." },
      { slug: "booking", label: "Opciones de agendamiento", description: "Métodos disponibles para agendar." },
      { slug: "benefits", label: "Beneficios de agendar", description: "Textos debajo del formulario de agenda." },
    ],
  },
  {
    label: "FAQ",
    items: [
      { slug: "faq", label: "Preguntas frecuentes", description: "Preguntas y respuestas + SEO estructurado." },
    ],
  },
  {
    label: "Contacto / Footer",
    items: [
      { slug: "contact-copy", label: "Contacto", description: "Encabezados y textos del bloque de contacto." },
      { slug: "support", label: "Íconos de contacto rápido", description: "Íconos de contacto rápido en la columna de soporte." },
      { slug: "locations", label: "Sedes / ubicaciones", description: "Tarjetas de sede con nombre y descripción." },
      { slug: "legal", label: "Enlaces legales", description: "Política de privacidad, términos, etc." },
    ],
  },
  {
    label: "Marketing",
    items: [
      { slug: "campaigns", label: "Campañas", description: "Banners promocionales, con opción de ocultar toda la sección." },
    ],
  },
  {
    label: "General",
    items: [
      { slug: "navbar", label: "Navbar", description: "Enlaces del menú de navegación superior." },
      { slug: "seo", label: "SEO y metadatos", description: "Título y descripción para buscadores." },
    ],
  },
];

export const DEFAULT_SECTION = "company-info";
```

- [ ] **Step 2: Rewrite `ContentShell.tsx`'s `SectionPanel` switch**

```tsx
function SectionPanel({ section }: { section: string }) {
  switch (section) {
    case "company-info":
      return <AdminCompanyInfoPanel />;
    case "channels":
      return <AdminHomepageChannelsPanel />;
    case "social":
      return <AdminHomepageSocialLinksPanel />;
    case "hero":
      return <AdminHeroPanel />;
    case "hero-stats":
      return <AdminHomepageHeroStatsPanel />;
    case "services-copy":
      return <AdminServicesCopyPanel />;
    case "agenda-copy":
      return <AdminAgendaCopyPanel />;
    case "booking":
      return <AdminHomepageBookingOptionsPanel />;
    case "benefits":
      return <AdminHomepageBookingBenefitsPanel />;
    case "faq":
      return <AdminHomepageFaqPanel />;
    case "contact-copy":
      return <AdminContactCopyPanel />;
    case "support":
      return <AdminHomepageContactSupportItemsPanel />;
    case "locations":
      return <AdminHomepageLocationsPanel />;
    case "legal":
      return <AdminHomepageLegalLinksPanel />;
    case "campaigns":
      return <AdminCampaignsPanel />;
    case "navbar":
      return <AdminHomepageNavLinksPanel />;
    case "seo":
      return <AdminSeoPanel />;
    default:
      return <AdminCompanyInfoPanel />;
  }
}
```
Update the import block accordingly: remove `AdminHomepageSettingsPanel`, add `AdminCompanyInfoPanel`, `AdminHomepageChannelsPanel`, `AdminHeroPanel`, `AdminServicesCopyPanel`, `AdminAgendaCopyPanel`, `AdminContactCopyPanel`, `AdminSeoPanel`. Remove `AdminHomepageSpecialistsPanel`/`AdminHomepageServicesPanel` imports (deleted in Tasks 16/20) — there is no "specialists"/"services-catalog" case anymore, those sections are managed from Staff/`admin/services` respectively.

- [ ] **Step 3: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually click through every sidebar entry, confirm each renders its panel with no console errors, confirm URL `?section=` syncing still works (the `key={activeSection}` remount fix from the prior plan's final review still applies unchanged).

- [ ] **Step 4: Commit**

```bash
git add app/portal/admin/content/ContentShell.tsx app/portal/admin/content/ContentSidebar.tsx
git commit -m "feat(admin): final Content sidebar structure, one entry per component"
```

---

### Task 23: Minor fixes — rename, translate, icon previews

**Files:**
- Modify: `app/portal/admin/content/ContentSidebar.tsx` (already renamed "Canales de soporte" → "Íconos de contacto rápido" in Task 22, Step 1 — no further change needed here for the rename itself)
- Modify: `app/portal/admin/content/AdminHomepageBookingOptionsPanel.tsx`
- Modify: `app/portal/admin/content/components/PlacementCheckboxes.tsx` (n/a — labels already in Spanish from Task 6)
- Modify: every panel with an icon `<select>`: `AdminServicesPanel.tsx` (Task 19's new icon field), `AdminHomepageBookingBenefitsPanel.tsx`, `AdminHomepageContactSupportItemsPanel.tsx`, `AdminHomepageSocialLinksPanel.tsx`, `AdminHomepageChannelsPanel.tsx` (n/a — no icon picker, uses type selector)

**Interfaces:**
- Produces: a shared `IconSelect` component rendering each option with its actual glyph next to the name.

- [ ] **Step 1: Translate English labels in `AdminHomepageBookingOptionsPanel.tsx`**

Change the "new option" form's `placeholder="Value"` → `placeholder="Valor"`, `placeholder="Label"` → `placeholder="Etiqueta"` (matching the exact wording already used in `AdminHomepageNavLinksPanel.tsx`/`AdminHomepageSocialLinksPanel.tsx`).

- [ ] **Step 2: Create a shared icon-preview select component**

```tsx
// app/portal/admin/content/components/IconSelect.tsx
"use client";

import * as Icons from "@/components/ui/Icon";
import { MARKETING_ICON_KEYS, type MarketingIconKey } from "@/lib/marketing/homepage-types";

export function IconSelect({
  value,
  onChange,
  disabled,
}: {
  value: MarketingIconKey;
  onChange: (next: MarketingIconKey) => void;
  disabled?: boolean;
}) {
  const SelectedIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[value];
  return (
    <div className="flex items-center gap-2">
      {SelectedIcon ? <SelectedIcon size={18} /> : null}
      <select
        className="input h-11 flex-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as MarketingIconKey)}
        disabled={disabled}
      >
        {MARKETING_ICON_KEYS.map((icon) => (
          <option key={icon} value={icon}>
            {icon}
          </option>
        ))}
      </select>
    </div>
  );
}
```
Note: native `<select>` elements cannot render icons inside their own `<option>` list (a browser limitation) — the preview shows next to the dropdown for the *currently selected* value, which is the achievable, honest version of "visual preview" here; a full icon-grid picker (each option showing its own glyph before selection) would be a larger component replacement, out of scope for this fix-sized task.

- [ ] **Step 3: Replace the bare icon `<select>` in each panel with `IconSelect`**

In `AdminHomepageBookingBenefitsPanel.tsx`, `AdminHomepageContactSupportItemsPanel.tsx`, `AdminHomepageSocialLinksPanel.tsx`, and Task 19's new icon field in `AdminServicesPanel.tsx`'s `ServiceModal`, replace the raw `<select>{MARKETING_ICON_KEYS.map(...)}</select>` with `<IconSelect value={...} onChange={...} disabled={saving} />`.

- [ ] **Step 4: Verify**

`npm run build && npm run typecheck && npm run lint`. Manually confirm each icon selector still saves correctly and now shows a glyph preview.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(admin): translate English labels, add icon preview to icon selectors"
```

---

## Verification (whole plan)

```
npm run build && npm run typecheck && npm run lint && npm run test
```

Plus a manual pass covering: every sidebar entry loads without error; the 4-placement toggle behaves correctly for at least one channel and one social link (the Facebook-in-footer-not-infobar test case from the original design); an Especialista and a Servicio migrated in Tasks 14/18 render correctly on the public homepage; the "Servicios que ofrece" flow inside `RoleModal.tsx` (built in an earlier phase of this project) still works unaffected by `ProfessionalProfile`'s new columns; a fresh professional/service with `showOnHomepage=false` does NOT appear publicly until toggled on.
