# Scheduling model (operational)

## Source of truth

As of this update, effective bookable availability is calculated in **one place**:

- `lib/scheduling/effective-availability.ts`
- consumed by `GET /api/slots`

Both receptionist and patient booking flows call `/api/slots`, so they now share the same availability truth.

## New domain models

- `ProfessionalService`
  - explicit professional ↔ service assignment
  - `active`, `onlineBookable`, optional per-assignment duration and buffers
- `ProfessionalWorkingSchedule`
  - admin-defined baseline weekly schedule by weekday + time range
  - supports status (`PENDING_CONFIRMATION`, `CONFIRMED`, `CHANGES_REQUESTED`)
- `ProfessionalScheduleAdjustment`
  - professional change requests with date window and review metadata
- `ProfessionalUnavailability`
  - typed absences/blocks:
    - `VACATION`
    - `SICK_LEAVE`
    - `TRAINING`
    - `ADMIN_TIME`
    - `PERSONAL_LEAVE`
    - `INTERNAL_BLOCK`
    - `OTHER`
  - status lifecycle (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`)

## Slot consistency

`TimeSlot` now has a uniqueness constraint on `(professionalId, startAt, endAt)` to prevent duplicate materialized slots.

## Operational APIs

### Admin

- `GET /api/admin/scheduling`
  - returns assignments + baseline schedules
- `POST /api/admin/scheduling`
  - `assignService`
  - `upsertWorkingSchedule`

### Professional

- `GET /api/professional/schedule`
  - returns baseline schedules, adjustments, and unavailability entries
- `POST /api/professional/schedule`
  - `confirmSchedule`
  - `requestAdjustment`
  - `createUnavailability`

## Booking rules now enforced

When creating appointments, backend now verifies:

1. service is active
2. slot is available
3. **professional has active + onlineBookable assignment to selected service**

This validation is applied for both:

- `POST /api/appointments`
- `POST /api/client/appointments`

## UI updates

- Admin: new scheduling operations page at `/portal/admin/scheduling`
- Professional calendar: simplified operational UI for baseline confirmation, adjustment requests, and typed unavailability

## Migration

Apply Prisma migration:

- `prisma/migrations/20260328120000_scheduling_operational_foundation/migration.sql`

Then run Prisma client generation before build.
