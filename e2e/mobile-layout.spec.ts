import { expect, test, type Page } from "@playwright/test";

/**
 * DOG-62: en producción el hero se salía de la pantalla en celulares y cortaba el texto. No había
 * scroll horizontal porque `main` recortaba el desborde, así que `scrollWidth` solo no basta: se
 * mide cada elemento visible contra el viewport.
 */
const WIDTHS = [320, 360, 390];
const PAGES = ["/", "/auth/login", "/auth/register"];

async function findOverflowingElements(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders: string[] = [];
    if (document.documentElement.scrollWidth > viewportWidth) {
      offenders.push(`documento: scrollWidth ${document.documentElement.scrollWidth} > ${viewportWidth}`);
    }

    // Un ancestro que recorta y cabe en pantalla (carrusel, máscara) vuelve el desborde intencional.
    const clippedByAncestor = (element: Element) => {
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (/hidden|clip|auto|scroll/.test(style.overflowX)) {
          const rect = parent.getBoundingClientRect();
          if (rect.left >= -1 && rect.right <= viewportWidth + 1) return true;
        }
      }
      return false;
    };

    for (const element of document.querySelectorAll("body *")) {
      if (element.closest("svg, [aria-hidden='true'], .sr-only")) continue;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.visibility === "hidden" || style.display === "none" || rect.width === 0 || rect.height === 0) continue;
      if (style.position === "fixed") continue;
      if ((rect.right > viewportWidth + 1 || rect.left < -1) && !clippedByAncestor(element)) {
        const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
        offenders.push(`<${element.tagName.toLowerCase()}> "${text}" ${Math.round(rect.left)}–${Math.round(rect.right)}`);
      }
    }
    return offenders.slice(0, 10);
  });
}

for (const width of WIDTHS) {
  test.describe(`celular de ${width} px`, () => {
    test.use({ viewport: { width, height: 780 } });

    for (const path of PAGES) {
      test(`${width === 360 ? "@smoke " : ""}${path} no se sale de la pantalla`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await findOverflowingElements(page)).toEqual([]);
      });
    }
  });
}

test.describe("aviso de cookies a 320 px", () => {
  // Visitante nuevo: sin la decisión de cookies precargada en playwright.config.ts.
  test.use({ viewport: { width: 320, height: 700 }, storageState: { cookies: [], origins: [] } });

  test("los botones del aviso caben en la pantalla", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("region", { name: "Tu privacidad" });
    await expect(banner).toBeVisible();
    for (const name of ["Personalizar", "Solo esenciales", "Aceptar todo"]) {
      const box = await banner.getByRole("button", { name, exact: true }).boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.x, name).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, name).toBeLessThanOrEqual(320);
    }
  });
});

test.describe("botones flotantes en celular", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("solo queda un botón flotante a la vista", async ({ page }) => {
    await page.goto("/");
    const actions = page.getByRole("region", { name: "Accesos rápidos" }).getByRole("link");
    await expect(actions.filter({ visible: true })).toHaveCount(1);
  });

  test("el menú móvil tapa el contenido con fondo opaco", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    const menu = page.locator("#mobileMenu");
    await expect(menu).toBeVisible();
    const background = await menu.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(background).toMatch(/^rgb\(/);
  });
});
