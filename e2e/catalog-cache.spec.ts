import { test, expect } from "@playwright/test";

import { seedAdminSession } from "./utils/session";
import { seedTestData } from "./utils/seed";

/**
 * DOG-14: los catálogos (home, servicios, especialidades) se sirven desde la caché de Next.
 * Lo que se edita desde el admin tiene que verse en la siguiente carga, no a los 5 minutos.
 */
test.describe("caché de catálogos", () => {
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for catalog cache test.");

  test("una especialidad nueva aparece al instante en la lista cacheada", async ({ context, request }) => {
    const seededUsers = await seedTestData(request);
    await seedAdminSession(context, seededUsers);
    const api = context.request;

    // Primera lectura: llena la caché.
    const before = await api.get("/api/specialties");
    expect(before.ok()).toBeTruthy();

    const name = `Especialidad caché ${Date.now()}`;
    const created = await api.post("/api/specialties", {
      data: { name, defaultSlotDurationMinutes: 30 },
    });
    expect(created.ok()).toBeTruthy();

    const after = await api.get("/api/specialties");
    const specialties = (await after.json()) as Array<{ name: string }>;
    expect(specialties.map((specialty) => specialty.name)).toContain(name);
  });

  test("una pregunta frecuente nueva aparece al instante en el home", async ({ context, page, request }) => {
    const seededUsers = await seedTestData(request);
    await seedAdminSession(context, seededUsers);

    // Primera visita: llena la caché del home.
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const question = `¿Pregunta de caché ${Date.now()}?`;
    const created = await context.request.post("/api/admin/homepage/faqs", {
      data: { question, answer: "Respuesta de prueba." },
    });
    expect(created.ok()).toBeTruthy();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(question)).toBeVisible();
  });
});
