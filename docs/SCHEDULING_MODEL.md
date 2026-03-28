# Scheduling model (phase 1 foundation)

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

## Phase 2 direction

Phase 2 should build on this foundation by introducing:

- effective availability generation that prioritizes baseline schedule + approved adjustments + unavailability
- clear precedence rules and conflict resolution
- receptionist/patient booking UX refinements based on the formal domain introduced here
