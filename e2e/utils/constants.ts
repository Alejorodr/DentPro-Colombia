export type E2EPortalRole = "RECEPCIONISTA" | "PACIENTE" | "PROFESIONAL" | "ADMINISTRADOR";

export const E2E_ROUTES = {
  login: "/auth/login",
  portal: {
    PACIENTE: "/portal/client",
    PROFESIONAL: "/portal/professional",
    ADMINISTRADOR: "/portal/admin",
    RECEPCIONISTA: "/portal/receptionist",
  } satisfies Record<E2EPortalRole, string>,
  receptionist: {
    dashboard: "/portal/receptionist/dashboard",
    schedule: "/portal/receptionist/schedule",
  },
} as const;

export const E2E_TEST_IDS = {
  receptionistSchedulePage: "receptionist-schedule-page",
  clientDashboardPage: "client-dashboard-page",
  clientTotalVisits: "client-total-visits",
  clientBookAppointmentLink: "client-book-appointment-link",
  adminDashboardTitle: "admin-dashboard-title",
  availabilityBlock: "availability-block",
  confirmAppointment: "confirm-appointment",
} as const;

export const E2E_SELECTORS = {
  loginEmail: "#login-email",
  loginPassword: "#login-password",
} as const;
