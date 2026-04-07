import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSession = vi.fn();
const mockHead = vi.fn();
const mockLogClinicalAccess = vi.fn();

const mockPrisma = {
  clinicalAttachment: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@prisma/client", () => ({
  AccessLogAction: {
    VIEW: "VIEW",
    DELETE: "DELETE",
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock("@vercel/blob", () => ({
  head: (...args: unknown[]) => mockHead(...args),
}));

vi.mock("@/lib/clinical/access-log", () => ({
  logClinicalAccess: () => mockLogClinicalAccess(),
}));

vi.mock("@/lib/clinical/access", () => ({
  getProfessionalProfile: vi.fn(),
}));

describe("clinical attachments authz hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for patient requesting another patient's attachment", async () => {
    const { GET: downloadAttachment } = await import("@/app/api/clinical/attachments/[attachmentId]/download/route");

    mockRequireSession.mockResolvedValue({ user: { id: "user-patient-1", role: "PACIENTE" } });
    mockPrisma.clinicalAttachment.findFirst.mockResolvedValue(null);

    const response = await downloadAttachment(new Request("http://localhost/api/clinical/attachments/a-1/download"), {
      params: Promise.resolve({ attachmentId: "a-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockHead).not.toHaveBeenCalled();
    expect(mockLogClinicalAccess).not.toHaveBeenCalled();
  });

  it("returns 404 for professional trying to delete attachment outside own scope", async () => {
    const { DELETE: deleteAttachment } = await import("@/app/api/clinical/attachments/[attachmentId]/route");

    mockRequireSession.mockResolvedValue({ user: { id: "user-prof-1", role: "PROFESIONAL" } });
    mockPrisma.clinicalAttachment.findFirst.mockResolvedValue(null);

    const response = await deleteAttachment(new Request("http://localhost/api/clinical/attachments/a-1", { method: "DELETE" }), {
      params: Promise.resolve({ attachmentId: "a-1" }),
    });

    expect(response.status).toBe(404);
    expect(mockPrisma.clinicalAttachment.update).not.toHaveBeenCalled();
    expect(mockLogClinicalAccess).not.toHaveBeenCalled();
  });
});
