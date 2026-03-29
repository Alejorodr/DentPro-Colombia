import { test, expect } from "@playwright/test";

import { seedTestData } from "./utils/seed";
import { E2E_ROUTES, E2E_SELECTORS, E2E_TEST_IDS } from "./utils/constants";

test("patient can book an appointment from the portal", async ({ page, request }) => {
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  test.skip(!hasDatabase, "DATABASE_URL is required for client portal test.");

  await seedTestData(request);

  const email = process.env.DEMO_PATIENT_EMAIL ?? "demo-paciente@dentpro.co";
  const password = process.env.DEMO_PATIENT_PASSWORD ?? "DentProDemo!1";

  await page.goto(E2E_ROUTES.login, { waitUntil: "domcontentloaded" });
  await page.locator(E2E_SELECTORS.loginEmail).fill(email);
  await page.locator(E2E_SELECTORS.loginPassword).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/portal\/client/);
  const totalVisitsText = await page.getByTestId(E2E_TEST_IDS.clientTotalVisits).innerText();
  const totalVisits = Number.parseInt(totalVisitsText.trim(), 10);
  expect(Number.isFinite(totalVisits)).toBeTruthy();
  // Contracto del seed admin: demo-paciente siempre tiene al menos dos citas históricas completadas.
  expect(totalVisits).toBeGreaterThanOrEqual(2);

  await page.getByTestId(E2E_TEST_IDS.clientBookAppointmentLink).click();
  await expect(page).toHaveURL(/\/portal\/client\/book/);

  const servicesResponse = await request.get("/api/services?active=true");
  expect(servicesResponse.status()).toBe(200);
  const servicesPayload = (await servicesResponse.json()) as { data?: Array<{ id: string; name: string }> };
  const services = servicesPayload.data ?? [];
  const selectedService = services.find((service) => service.name === "Limpieza Dental") ?? services[0];
  expect(selectedService).toBeTruthy();
  await page.getByRole("button", { name: selectedService.name }).click();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateValue = tomorrow.toISOString().split("T")[0];
  await page.getByTestId(`date-${dateValue}`).click();

  const slotButton = page.locator("[data-testid^='slot-']").first();
  await expect(slotButton).toBeVisible();
  const slotTestId = await slotButton.getAttribute("data-testid");
  const slotId = slotTestId?.replace("slot-", "") ?? "";
  await slotButton.click();

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/client/appointments") && response.request().method() === "POST",
  );
  await page.getByTestId(E2E_TEST_IDS.confirmAppointment).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);

  await expect(page).toHaveURL(/\/portal\/client\/appointments/);
  await expect(page.getByText(selectedService.name)).toBeVisible();

  const slotsResponse = await request.get(`/api/slots?serviceId=${selectedService.id}&date=${dateValue}`);
  expect(slotsResponse.status()).toBe(200);
  const slotsPayload = (await slotsResponse.json()) as { slots: Array<{ id: string }> };
  const slotIds = slotsPayload.slots.map((slot) => slot.id);
  expect(slotIds).not.toContain(slotId);
});
