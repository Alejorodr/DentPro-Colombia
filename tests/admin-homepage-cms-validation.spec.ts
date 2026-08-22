// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postLegalLink } from "@/app/api/admin/homepage/legal-links/route";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { getPrismaClient } from "@/lib/prisma";

vi.mock("@/app/api/_utils/auth", () => ({
  getSessionUser: vi.fn(),
  isAuthorized: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

describe("homepage CMS validations", () => {
  const homepageLegalLink = {
    aggregate: vi.fn(),
    create: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUser).mockResolvedValue({ id: "admin-1", role: "ADMINISTRADOR" } as any);
    vi.mocked(isAuthorized).mockReturnValue(true);
    vi.mocked(getPrismaClient).mockReturnValue({ homepageLegalLink } as any);
    homepageLegalLink.aggregate.mockResolvedValue({ _max: { sortOrder: 1 } });
    homepageLegalLink.create.mockResolvedValue({
      id: "legal-1",
      href: "/terminos",
      label: "Términos",
      sortOrder: 2,
      isActive: true,
    });
  });

  it("rechaza href inválido en links legales", async () => {
    const response = await postLegalLink(
      new Request("http://localhost/api/admin/homepage/legal-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          href: "javascript:alert(1)",
          label: "Aviso legal",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(homepageLegalLink.create).not.toHaveBeenCalled();
  });
});
