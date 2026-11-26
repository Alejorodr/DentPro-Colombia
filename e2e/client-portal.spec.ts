import { test, expect, type Browser, type Page } from "@playwright/test";

import { seedTestData, type SeededUsersByRole } from "./utils/seed";
import { seedAdminSession } from "./utils/session";
import { E2E_TEST_IDS } from "./utils/constants";
import { loginFromPortal } from "./utils/login";

/**
 * El paciente demo tiene un tope de 3 citas activas futuras. Cuántas trae ya depende de la
 * hora (el seed crea citas para "hoy a las 9:00 y 11:00") y de qué otros specs reservaron antes
 * en la misma corrida, así que la prueba fallaba de forma intermitente con
 * "Ya tienes 3 citas activas". Se cancelan como administrador (el paciente solo puede
 * cancelar con 24 h de anticipación) para dejar espacio a la reserva.
 */
async function leaveRoomUnderActiveCap(patientPage: Page, browser: Browser, seededUsers: SeededUsersByRole) {
  const listResponse = await patientPage.request.get("/api/appointments?pageSize=50");
  expect(listResponse.ok()).toBeTruthy();
  const { data = [] } = (await listResponse.json()) as {
    data?: Array<{ id: string; status: string; timeSlot: { startAt: string } }>;
  };
  const now = Date.now();
  const active = data.filter(
    (appointment) =>
      ["SCHEDULED", "CONFIRMED"].includes(appointment.status) && new Date(appointment.timeSlot.startAt).getTime() > now,
  );
  if (active.length === 0) return;

  const adminContext = await browser.newContext();
  try {
    await seedAdminSession(adminContext, seededUsers);
    for (const appointment of active) {
      const response = await adminContext.request.patch(`/api/appointments/${appointment.id}`, {
        data: { status: "CANCELLED" },
      });
      expect(response.ok()).toBeTruthy();
    }
  } finally {
    await adminContext.close();
  }
}

function formatDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

test("patient can book an appointment from the portal", async ({
  page,
  request,
  browser,
}) => {
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  test.skip(!hasDatabase, "DATABASE_URL is required for client portal test.");

  const seededUsers = await seedTestData(request);

  const email = process.env.DEMO_PATIENT_EMAIL ?? "demo-paciente@dentpro.co";
  const password = process.env.DEMO_PATIENT_PASSWORD ?? "DentProDemo!1";

  const { submitButton } = await loginFromPortal(page, { email, password });
  await submitButton.click();

  await expect(page).toHaveURL(/\/portal\/client/);
  const totalVisitsText = await page
    .getByTestId(E2E_TEST_IDS.clientTotalVisits)
    .innerText();
  const totalVisits = Number.parseInt(totalVisitsText.trim(), 10);
  expect(Number.isFinite(totalVisits)).toBeTruthy();
  // Contracto del seed admin: demo-paciente siempre tiene al menos dos citas históricas completadas.
  expect(totalVisits).toBeGreaterThanOrEqual(2);

  await leaveRoomUnderActiveCap(page, browser, seededUsers);

  await page.getByTestId(E2E_TEST_IDS.clientBookAppointmentLink).click();
  await expect(page).toHaveURL(/\/portal\/client\/book/);

  const servicesResponse = await request.get("/api/services?active=true");
  expect(servicesResponse.status()).toBe(200);
  const servicesPayload = (await servicesResponse.json()) as {
    data?: Array<{ id: string; name: string }>;
  };
  const services = servicesPayload.data ?? [];
  const selectedService =
    services.find((service) => service.name === "Limpieza Dental") ??
    services[0];
  expect(selectedService).toBeTruthy();
  await page.getByRole("button", { name: selectedService.name }).click();

  const now = new Date();
  const dateCandidates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    return formatDateInput(date);
  });
  const nowMs = Date.now();

  // DOG-39: con varios workers (o --repeat-each) esta prueba corre en paralelo con la misma
  // paciente. Si todas eligen el primer horario libre, una reserva y las demás reciben 409.
  // Se reúnen los horarios futuros de la semana y cada corrida toma uno distinto.
  const futureSlots: Array<{ id: string; date: string }> = [];
  for (const candidate of dateCandidates) {
    const slotsResponse = await request.get(
      `/api/slots?serviceId=${selectedService.id}&date=${candidate}`,
    );
    expect(slotsResponse.status()).toBe(200);
    const payload = (await slotsResponse.json()) as {
      slots?: Array<{ id: string; startAt: string }>;
    };
    for (const slot of payload.slots ?? []) {
      if (new Date(slot.startAt).getTime() > nowMs) {
        futureSlots.push({ id: slot.id, date: candidate });
      }
    }
  }

  expect(futureSlots.length).toBeGreaterThan(0);
  const { parallelIndex, repeatEachIndex } = test.info();
  const pickIndex = (parallelIndex * 31 + repeatEachIndex * 7 + Math.floor(Math.random() * 5)) % futureSlots.length;
  const dateValue = futureSlots[pickIndex].date;
  const chosenSlotId = futureSlots[pickIndex].id;
  await page.getByTestId(`date-${dateValue}`).click();

  const slotButton = page.getByTestId(`slot-${chosenSlotId}`);
  await expect(slotButton).toBeVisible();
  await slotButton.click();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/client/appointments") &&
      response.request().method() === "POST",
  );
  await page.getByTestId(E2E_TEST_IDS.confirmAppointment).click();
  const response = await responsePromise;
  // DOG-65: con el cuerpo en el mensaje, un 404 dice cuál fue (slot, servicio o perfil).
  expect(response.status(), await response.text()).toBe(201);
  const createdAppointment = (await response.json()) as { id?: string };
  expect(createdAppointment.id).toBeTruthy();

  await expect(page).toHaveURL(/\/portal\/client\/appointments/);
  const createdAppointmentCard = page.getByTestId(
    `client-appointment-${createdAppointment.id}`,
  );
  await expect(createdAppointmentCard).toBeVisible();
  await expect(
    createdAppointmentCard.getByText(selectedService.name),
  ).toBeVisible();

  const slotsResponse = await request.get(
    `/api/slots?serviceId=${selectedService.id}&date=${dateValue}`,
  );
  expect(slotsResponse.status()).toBe(200);
  const slotsPayload = (await slotsResponse.json()) as {
    slots: Array<{ id: string }>;
  };
  const slotIds = slotsPayload.slots.map((slot) => slot.id);
  expect(slotIds).not.toContain(chosenSlotId);
});
