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
