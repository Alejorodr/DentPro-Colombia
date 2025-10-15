import { appendAppointment, createAppointmentFromRequest, mockAppointments, mockPatients, mockSchedules } from "./mock-data";
import type { AppointmentRequestPayload, AppointmentSummary, PatientSummary, ScheduleSlot } from "./types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface MockResponse<T> {
  data: T;
}

type ResourceMap = {
  appointments: AppointmentSummary[];
  schedules: ScheduleSlot[];
  patients: PatientSummary[];
};

type ResourceName = keyof ResourceMap;

export const apiClient = {
  async get<T extends ResourceName>(resource: T): Promise<MockResponse<ResourceMap[T]>> {
    await delay(200);
    if (resource === "appointments") {
      return { data: [...mockAppointments] };
    }
    if (resource === "schedules") {
      return { data: [...mockSchedules] };
    }
    return { data: [...mockPatients] };
  },
  async post(resource: "appointments", payload: AppointmentRequestPayload): Promise<MockResponse<AppointmentSummary>> {
    await delay(300);
    const id = `a-${Date.now()}`;
    const appointment = createAppointmentFromRequest(payload, id);
    appendAppointment(appointment);
    return { data: appointment };
  },
};
