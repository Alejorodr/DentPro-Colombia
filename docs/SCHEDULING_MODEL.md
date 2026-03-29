# Scheduling model (phase 1 + phase 2 effective availability)

## Scope of this phase

Phase 1 establishes the **foundational domain** for clinic scheduling:

1. Explicit professional ↔ service eligibility.
2. Admin-owned baseline weekly working schedule.
3. Operational admin workflow to manage both.

This phase does **not** implement full effective-availability orchestration, slot regeneration, or end-to-end receptionist/patient booking redesign.

## Core domain models

### `ProfessionalService`

Formal relationship between a professional and a service.

- one professional can have many services
- one service can have many professionals
- unique constraint on `(professionalId, serviceId)` prevents duplicate assignments
- operational fields:
  - `active`
  - `onlineBookable`
  - `appointmentDurationMinutes`
  - `bufferBeforeMinutes`
  - `bufferAfterMinutes`
  - `notes`

This model is now the formal source for service eligibility checks.

### `ProfessionalWorkingSchedule`

Admin-defined baseline weekly schedule per professional.

- `professionalId`, `dayOfWeek`, `startTime`, `endTime`
- `timezone` (default `America/Bogota`)
- optional `effectiveFrom`/`effectiveTo`
- `active` flag for safe deactivation
- `status` maintained as `CONFIRMED` for admin baseline rows

Schema-level protections include:

- day-of-week check (`0..6`)
- end time must be greater than start time
- unique index on `(professionalId, dayOfWeek, startTime, endTime, timezone)`

API-level protections additionally reject overlapping active time ranges for the same professional/day and overlapping date windows.

## Admin workflow

Admin scheduling page: `/portal/admin/scheduling`

From one professional context, admin can:

- list assigned services
- assign a new service
- deactivate an assignment
- toggle online-bookable state
- list baseline weekly schedule blocks
- create schedule blocks
- edit schedule blocks
- deactivate schedule blocks

No RRULE/technical recurrence syntax is exposed in this workflow.

## Admin scheduling API

Route: `/api/admin/scheduling`

- `GET ?professionalId=<uuid>`
  - lists assignments + baseline schedules for one professional
- `POST` actions:
  - `createAssignment`
  - `updateAssignment`
  - `deactivateAssignment`
  - `createSchedule`
  - `updateSchedule`
  - `deleteSchedule` (safe deactivation)

Legacy action names (`assignService`, `upsertWorkingSchedule`) are still accepted for backward compatibility.

## Booking alignment

Appointment creation endpoints keep enforcing explicit assignment checks:

- `POST /api/appointments`
- `POST /api/client/appointments`

Both require an active + online-bookable `ProfessionalService` row for the selected professional/service combination.

## Seed and QA support

Seed now creates:

- default `ProfessionalService` rows based on specialty matching (bootstrapping data only)
- confirmed baseline weekly schedule rows for each active professional

This gives QA and manual testing immediate operational data for admin scheduling flows.

## Phase 2: unified effective availability engine

Phase 2 introduces one centralized backend engine (`lib/scheduling/effective-availability.ts`) as the operational source of truth for bookability.

### Operational unavailability model

`ProfessionalUnavailability` is the persisted operational exception model used by the engine.

- reason types: `VACATION`, `SICK_LEAVE`, `TRAINING`, `ADMIN_TIME`, `PERSONAL_LEAVE`, `INTERNAL_BLOCK`, `OTHER`
- status lifecycle: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
- supports full-day and partial-day ranges
- auditability fields include:
  - `createdByUserId`
  - `approvedByUserId`
  - `updatedByUserId`
  - `notes`
  - `internalNotes`
- legacy `reason` field is preserved for compatibility and mapped to `notes` in new writes

### Effective availability data sources

The engine computes effective slots using:

1. `ProfessionalService` eligibility (`active` + `onlineBookable`)
2. `ProfessionalWorkingSchedule` confirmed baseline ranges
3. `ProfessionalUnavailability` blocks
4. `ClinicHoliday` full-day exclusions
5. non-cancelled `Appointment` occupied ranges
6. existing `TimeSlot` records as booking candidates
7. service/assignment duration requirements + buffer checks

### Precedence and behavior

For each candidate slot, the engine applies:

1. service eligibility check
2. clinic holiday exclusion
3. baseline schedule containment
4. unavailability and occupied-range overlap checks
5. slot status check (`AVAILABLE`)
6. appointment buffer conflict checks
7. duration sufficiency check based on assignment override or service duration

The same engine is now used by:

- `GET /api/slots` (with optional `professionalId`)
- `GET /api/availability/effective` (range-based API)
- appointment booking validation (`POST /api/appointments`, `POST /api/client/appointments`)
- reschedule validation (`POST /api/appointments/[id]/reschedule`)

### Compatibility and deferred work

Preserved for compatibility in Phase 2:

- existing `TimeSlot` model and slot lifecycle
- existing Phase 1 admin schedule management flows
- existing professional schedule workflow for creating unavailability entries

Still deferred to Phase 3:

- full slot materialization/regeneration/invalidation redesign
- end-to-end receptionist/patient booking UX overhaul
- retirement/migration strategy for legacy availability artifacts (`AvailabilityRule`, `AvailabilityException`, `AvailabilityBlock`)

## Phase 3: operational slot inventory reliability

Phase 3 defines `TimeSlot` as a **materialized projection** of effective availability (not an independent scheduling truth).

### Canonical booking truth

Booking now relies on both layers together:

1. `TimeSlot` inventory rows provide selectable, transactional booking units.
2. `getEffectiveAvailability` remains the operational validator for schedule, unavailability, holidays, assignment and overlap checks.

A slot must pass both inventory and effective validation before booking/rescheduling.

### Slot materialization ownership

`lib/scheduling/slot-inventory.ts` owns deterministic future inventory refresh.

- Inputs: confirmed baseline schedule + approved/pending unavailability + clinic holidays + existing non-cancelled appointments.
- Behavior: recomputes effective future windows and materializes deterministic slots by professional duration.
- Safety: deletes only **future unbooked AVAILABLE** slots in range, then recreates candidates with `createMany(..., skipDuplicates: true)`.
- Constraint safety: keeps the unique key `(professionalId, startAt, endAt)` unchanged.

### Regeneration triggers (phase 3 scope)

Future inventory refresh is triggered after operational changes that affect bookability:

- admin assignment create/update/deactivate (`/api/admin/scheduling`)
- admin baseline schedule create/update/deactivate (`/api/admin/scheduling`)
- clinic holiday creation (`/api/admin/holidays`)
- professional schedule confirmation and new unavailability entries (`/api/professional/schedule`)
- explicit admin manual generation endpoint (`/api/professionals/[id]/slots/generate`), now implemented as range refresh

### Seed idempotency

Seed/setup routes now write slot+appointment fixtures conflict-safely:

- `/api/ops/seed-admin`
- `/api/test/seed`

Both use slot `upsert` keyed by `(professionalId,startAt,endAt)` and appointment `upsert` keyed by `timeSlotId`, preventing repeated-seed duplicate slot failures (`P2002`).

### What remains after phase 3

- optional background/cron orchestration for periodic rolling-horizon inventory refresh
- explicit admin controls for regeneration horizon tuning by clinic
- phased retirement strategy for legacy `AvailabilityRule` / `AvailabilityException` / `AvailabilityBlock` models

## Phase 4: operational consolidation and canonical workflows

Phase 4 closes the remaining gap between scheduling domain entities and real booking behavior.

### Canonical model after phase 4

The canonical operational scheduling model is now:

1. `ProfessionalService` (eligibility + operational duration/buffer settings)
2. `ProfessionalWorkingSchedule` (baseline weekly operating windows)
3. `ProfessionalScheduleAdjustment` (temporary schedule override requests with admin review)
4. `ProfessionalUnavailability` (absences/internal blocks with approval lifecycle)
5. Effective availability engine + materialized `TimeSlot` inventory

Legacy availability entities (`AvailabilityRule`, `AvailabilityException`, `AvailabilityBlock`) are now explicitly legacy and no longer the write path for professional scheduling operations.

### Baseline + adjustment + unavailability interaction

- Baseline schedule (`ProfessionalWorkingSchedule`) is the default working frame.
- Approved adjustments (`ProfessionalScheduleAdjustment.status = CONFIRMED`) are applied by the engine and inventory materializer as temporary overrides.
  - If an adjustment references a `scheduleId`, it overrides that baseline block for the adjustment window/day.
  - `CHANGES_REQUESTED` remains pending (not applied).
  - `PENDING_CONFIRMATION` is used as a rejected/admin-closed state for adjustments.
- Unavailability rows block operational bookability according to their status lifecycle.

### Admin review workflow

`/api/admin/scheduling` and `/portal/admin/scheduling` now include closed-loop review actions:

- schedule adjustments: approve/reject
- unavailability entries: approve/reject/cancel

Reviewer decisions are persisted via audit fields already present in schema (`reviewedByUserId`, `approvedByUserId`, `updatedByUserId`).

### Booking flow alignment

- `/appointments/new` now loads bookable times through `/api/slots` (effective availability), not raw professional slot inventory.
- Selection order is operationally aligned: service → date → professional → real slots.
- Appointment creation/reschedule still performs final `assertSlotBookable` validation.

### Slot inventory + service awareness

`refreshFutureInventoryForProfessional` now:

- suppresses online inventory for professionals without active + online-bookable assignments
- computes slot step using assignment/service duration plus buffer metadata (safe intermediate service-aware materialization)
- incorporates approved schedule adjustments in the same override logic used by effective availability

This is an incremental production-safe approach (not a full bespoke per-service slot-table rewrite).

### Public slot contract clarification

`GET /api/public/slots` is now explicitly a **teaser** contract for marketing surfaces:

- no operational slot identifiers are exposed
- response includes `contract: "teaser"` note
- feed is constrained to professionals that have active + online-bookable service assignments

Real booking availability remains `/api/slots` + booking APIs.

### Future follow-up after phase 4

- dedicated adjustment status enum (`PENDING/APPROVED/REJECTED`) to replace shared schedule status semantics
- optional impact preview UX before admin approval decisions
- deeper per-service inventory materialization strategy if clinic scale requires it
