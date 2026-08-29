import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSession = vi.fn();
const mockGet = vi.fn();
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
  get: (...args: unknown[]) => mockGet(...args),
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
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockLogClinicalAccess).not.toHaveBeenCalled();
  });

  it("streams an authorized attachment from private Blob storage", async () => {
    const { GET: downloadAttachment } = await import("@/app/api/clinical/attachments/[attachmentId]/download/route");

    mockRequireSession.mockResolvedValue({ user: { id: "user-admin-1", role: "ADMINISTRADOR" } });
    mockPrisma.clinicalAttachment.findFirst.mockResolvedValue({
      id: "a-1",
      patientId: "patient-1",
      filename: "xray.pdf",
      mimeType: "application/pdf",
      size: 4,
      storageKey: "clinical/a-1/xray.pdf",
      visibleToPatient: false,
      episode: { professionalId: "professional-1", visibleToPatient: false },
    });
    mockGet.mockResolvedValue({
      statusCode: 200,
      headers: new Headers({ "Content-Type": "application/pdf" }),
      stream: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1, 2, 3, 4])); controller.close(); } }),
      blob: { contentType: "application/pdf", size: 4 },
    });

    const response = await downloadAttachment(new Request("http://localhost/api/clinical/attachments/a-1/download"), {
      params: Promise.resolve({ attachmentId: "a-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(mockGet).toHaveBeenCalledWith("clinical/a-1/xray.pdf", { access: "private", useCache: false });
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
