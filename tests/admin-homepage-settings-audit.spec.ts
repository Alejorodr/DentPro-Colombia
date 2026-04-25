// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/admin/homepage/settings/route";

const { requireAdminMock, parseJsonMock, logAuditEventMock, findUniqueMock, upsertMock, updateMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  parseJsonMock: vi.fn(),
  logAuditEventMock: vi.fn(),
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/app/api/admin/homepage/_lib", async () => {
  const actual = await vi.importActual<typeof import("@/app/api/admin/homepage/_lib")>("@/app/api/admin/homepage/_lib");
  return {
    ...actual,
    requireAdmin: requireAdminMock,
  };
});

vi.mock("@/app/api/_utils/validation", () => ({ parseJson: parseJsonMock }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: logAuditEventMock }));
vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(() => ({
    homepageSettings: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
      update: updateMock,
    },
  })),
}));

const payload = {
  infoBarLocation: "Chía",
  infoBarHours: "L-V 8-6",
  infoBarWhatsappHref: null,
  infoBarWhatsappLabel: null,
  infoBarEmailHref: null,
  infoBarEmailLabel: null,
  heroBadge: null,
  heroTitle: "Nueva portada",
  heroDescription: "Descripción",
  heroPrimaryButtonText: null,
  heroPrimaryButtonHref: null,
  heroSecondaryButtonText: null,
  heroSecondaryButtonHref: null,
  heroImageUrl: null,
  heroImageAlt: null,
  heroTestimonialQuote: null,
  heroTestimonialAuthor: null,
  heroTestimonialRole: null,
  heroTestimonialAvatarUrl: null,
  heroHighlightTitle: null,
  heroHighlightDescription: null,
  bookingTitle: "Reserva",
  bookingDescription: "Agenda",
  bookingSelectLabel: null,
  bookingBenefitsTitle: null,
  bookingScheduleNote: null,
  bookingConsentNote: null,
  contactTitle: "Contacto",
  contactDescription: "Escríbenos",
  contactPhone: null,
  contactWhatsapp: null,
  contactEmail: null,
  contactAddress: null,
  contactSupportTitle: null,
  contactLocationsTitle: null,
  contactBrand: null,
  contactMapEmbedUrl: null,
  floatingWhatsappNumber: null,
  floatingPhoneNumber: null,
};

describe("PATCH /api/admin/homepage/settings audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, sessionUser: { id: "admin-1", role: "ADMINISTRADOR" } });
    parseJsonMock.mockResolvedValue({ data: payload });
    upsertMock.mockResolvedValue({ id: "homepage-main" });
    findUniqueMock.mockResolvedValue({ ...payload, heroTitle: "Antes" });
    updateMock.mockResolvedValue({ ...payload, id: "homepage-main" });
  });

  it("registra auditoría cuando actualiza settings", async () => {
    const response = await PATCH(new Request("http://localhost/api/admin/homepage/settings", { method: "PATCH" }));

    expect(response.status).toBe(200);
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "homepage.settings.updated",
        resourceType: "homepage_settings",
        status: "success",
      }),
    );
  });
});
