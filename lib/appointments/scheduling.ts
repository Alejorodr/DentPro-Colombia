import type { TimeSlot } from "@prisma/client";

const DEFAULT_BUFFER_MINUTES = 10;

export type SlotWindow = {
  startAt: Date;
  endAt: Date;
};

export function getAppointmentBufferMinutes(): number {
  const raw = process.env.APPOINTMENT_BUFFER_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return DEFAULT_BUFFER_MINUTES;
}

export function hasBufferConflict(
  target: SlotWindow,
  bookedSlots: Array<Pick<TimeSlot, "startAt" | "endAt">>,
  bufferMinutes: number,
): boolean {
  if (bufferMinutes <= 0) {
    return false;
  }
  const bufferMs = bufferMinutes * 60_000;
  const targetStart = target.startAt.getTime() - bufferMs;
  const targetEnd = target.endAt.getTime() + bufferMs;

  return bookedSlots.some((slot) => {
    const start = slot.startAt.getTime();
    const end = slot.endAt.getTime();
    return start < targetEnd && end > targetStart;
  });
}
