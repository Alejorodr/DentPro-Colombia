import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
let failOutsideRequest = false;
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => {
    if (failOutsideRequest) throw new Error("static generation store missing");
    revalidateTag(...args);
  },
}));

import { CATALOG_TAGS, catalogTagsForWrite, invalidateCatalogTags } from "@/lib/cache/catalog";

beforeEach(() => {
  revalidateTag.mockReset();
  failOutsideRequest = false;
});

describe("catalogTagsForWrite", () => {
  it("invalida el home al escribir en cualquier modelo Homepage*", () => {
    expect(catalogTagsForWrite("HomepageFaq", "update")).toEqual([CATALOG_TAGS.homepage]);
    expect(catalogTagsForWrite("HomepageSettings", "upsert")).toEqual([CATALOG_TAGS.homepage]);
  });

  it("invalida servicios y home al escribir en Service", () => {
    expect(catalogTagsForWrite("Service", "create")).toEqual([CATALOG_TAGS.services, CATALOG_TAGS.homepage]);
  });

  it("invalida especialidades y home al escribir en Specialty", () => {
    expect(catalogTagsForWrite("Specialty", "deleteMany")).toEqual([CATALOG_TAGS.specialties, CATALOG_TAGS.homepage]);
  });

  it("no invalida nada en lecturas ni en modelos que no son catálogo", () => {
    expect(catalogTagsForWrite("Service", "findMany")).toEqual([]);
    expect(catalogTagsForWrite("Appointment", "update")).toEqual([]);
    expect(catalogTagsForWrite(undefined, "update")).toEqual([]);
  });
});

describe("invalidateCatalogTags", () => {
  it("vence cada tag de inmediato", () => {
    invalidateCatalogTags([CATALOG_TAGS.services, CATALOG_TAGS.homepage]);
    expect(revalidateTag).toHaveBeenCalledWith(CATALOG_TAGS.services, { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith(CATALOG_TAGS.homepage, { expire: 0 });
  });

  it("no rompe la escritura fuera de un request de Next", () => {
    failOutsideRequest = true;
    expect(() => invalidateCatalogTags([CATALOG_TAGS.homepage])).not.toThrow();
  });
});
