import { test, expect } from "@playwright/test";

test("patient can book an appointment from the portal", async ({ page, request }) => {
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  test.skip(!hasDatabase, "DATABASE_URL is required for client portal test.");

  const opsKey = process.env.OPS_KEY ?? process.env.OPS_KEY_TEST ?? "ops-test-key";
  const seedResponse = await request.post("/api/ops/seed-admin", {
    headers: { "X-OPS-KEY": opsKey },
  });
  expect(seedResponse.status()).toBe(200);

  const email = process.env.DEMO_PATIENT_EMAIL ?? "demo-paciente@dentpro.co";
  const password = process.env.DEMO_PATIENT_PASSWORD ?? "DentProDemo!1";

  await page.goto("/auth/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/portal\/client/);
  await expect(page.getByTestId("client-total-visits")).toHaveText("2");

  await page.getByRole("link", { name: "Book Appointment" }).click();
  await expect(page).toHaveURL(/\/portal\/client\/book/);

  const servicesResponse = await request.get("/api/services?active=true");
  expect(servicesResponse.status()).toBe(200);
  const services = (await servicesResponse.json()) as Array<{ id: string; name: string }>;
  const selectedService = services.find((service) => service.name === "Limpieza Dental") ?? services[0];
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
  await page.getByTestId("confirm-appointment").click();
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
