import { AppointmentStatus } from "@prisma/client";

/**
 * Booking abuse limits (plan-refuerzo-2026-11-20, fase 4 P1 — F2).
 *
 * - Patients must book (or reschedule into) slots that start at least
 *   PATIENT_BOOKING_LEAD_TIME_MINUTES from now. Staff can book closer to the
 *   slot, but never a slot that has already started.
 * - Patients can hold at most MAX_ACTIVE_APPOINTMENTS_PER_PATIENT active future
 *   appointments (SCHEDULED/CONFIRMED). Staff bookings are exempt from the cap.
 */
const PATIENT_BOOKING_LEAD_TIME_MINUTES = 120;
export const MAX_ACTIVE_APPOINTMENTS_PER_PATIENT = 3;
const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];

export const LEAD_TIME_MESSAGE =
  "Debes agendar con al menos 2 horas de anticipación. Elige un horario más adelante.";
export const PAST_SLOT_MESSAGE = "No puedes agendar en un horario que ya pasó.";
export const ACTIVE_CAP_MESSAGE = `Ya tienes ${MAX_ACTIVE_APPOINTMENTS_PER_PATIENT} citas activas. Cancela una para agendar otra.`;

export type BookingRuleViolation = { status: 422; message: string };

/** Thrown inside booking transactions so the route can map it to a 422. */
export class BookingLimitError extends Error {
  readonly status = 422 as const;

  constructor(message: string) {
    super(message);
    this.name = "BookingLimitError";
  }
}

export function checkSlotLeadTime(
  slotStartAt: Date,
  role: string,
  now: Date = new Date(),
): BookingRuleViolation | null {
  const startMs = slotStartAt.getTime();
  if (role === "PACIENTE") {
    if (startMs <= now.getTime() + PATIENT_BOOKING_LEAD_TIME_MINUTES * 60_000) {
      return { status: 422, message: LEAD_TIME_MESSAGE };
    }
    return null;
  }

  if (startMs <= now.getTime()) {
    return { status: 422, message: PAST_SLOT_MESSAGE };
  }
  return null;
}

type AppointmentCountClient = {
  appointment: {
    count: (args: {
      where: {
        patientId: string;
        status: { in: AppointmentStatus[] };
        timeSlot: { startAt: { gt: Date } };
      };
    }) => Promise<number>;
  };
};

type RowLockClient = {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

export async function countActiveFutureAppointments(
  client: AppointmentCountClient,
  patientId: string,
  now: Date = new Date(),
) {
  return client.appointment.count({
    where: {
      patientId,
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      timeSlot: { startAt: { gt: now } },
    },
  });
}

/**
 * Enforces the per-patient active appointment cap inside a booking transaction.
 * The patient row is locked first (SELECT … FOR UPDATE) so concurrent bookings
 * by the same patient are serialized and cannot overshoot the cap.
 * Throws BookingLimitError when the cap is reached.
 */
export async function assertPatientBookingCapInTransaction(
  tx: AppointmentCountClient & RowLockClient,
  patientId: string,
  now: Date = new Date(),
) {
  await tx.$queryRaw`SELECT "id" FROM "PatientProfile" WHERE "id" = ${patientId} FOR UPDATE`;
  const active = await countActiveFutureAppointments(tx, patientId, now);
  if (active >= MAX_ACTIVE_APPOINTMENTS_PER_PATIENT) {
    throw new BookingLimitError(ACTIVE_CAP_MESSAGE);
  }
}

/**
 * Earliest slot start a patient (or public visitor) may book. Slots starting at
 * or before this instant are hidden from patient-facing pickers.
 */
export function getPatientBookingCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() + PATIENT_BOOKING_LEAD_TIME_MINUTES * 60_000);
}

export function isSlotBookableByPatient(slotStartAt: Date | string, now: Date = new Date()): boolean {
  return new Date(slotStartAt).getTime() > getPatientBookingCutoff(now).getTime();
}
