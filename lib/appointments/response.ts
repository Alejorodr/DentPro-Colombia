import { Prisma } from "@prisma/client";

export const appointmentMutationUserSelect = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

export const appointmentMutationResponseSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  reason: true,
  notes: true,
  status: true,
  patientId: true,
  professionalId: true,
  timeSlotId: true,
  serviceId: true,
  serviceName: true,
  servicePriceCents: true,
  checkedInAt: true,
  reminderSentAt: true,
  patient: {
    select: {
      id: true,
      patientCode: true,
      user: {
        select: appointmentMutationUserSelect,
      },
    },
  },
  professional: {
    select: {
      id: true,
      user: {
        select: appointmentMutationUserSelect,
      },
      specialty: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  timeSlot: {
    select: {
      id: true,
      startAt: true,
      endAt: true,
    },
  },
  service: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.AppointmentSelect;

type AppointmentMutationResponse = Prisma.AppointmentGetPayload<{
  select: typeof appointmentMutationResponseSelect;
}>;

export function serializeAppointmentMutationResponse(appointment: AppointmentMutationResponse) {
  return {
    id: appointment.id,
    reason: appointment.reason,
    notes: appointment.notes,
    status: appointment.status,
    patient: appointment.patient
      ? {
          id: appointment.patient.id,
          patientCode: appointment.patient.patientCode,
          user: {
            name: appointment.patient.user.name,
            lastName: appointment.patient.user.lastName,
          },
        }
      : null,
    professional: appointment.professional
      ? {
          id: appointment.professional.id,
          user: {
            name: appointment.professional.user.name,
            lastName: appointment.professional.user.lastName,
          },
          specialty: appointment.professional.specialty
            ? {
                id: appointment.professional.specialty.id,
                name: appointment.professional.specialty.name,
              }
            : null,
        }
      : null,
    timeSlot: {
      id: appointment.timeSlot.id,
      startAt: appointment.timeSlot.startAt,
      endAt: appointment.timeSlot.endAt,
    },
    service: appointment.service
      ? {
          id: appointment.service.id,
          name: appointment.service.name,
        }
      : null,
  };
}
