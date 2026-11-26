// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { matchesClinicalAttachmentSignature } from "@/lib/clinical/attachments";

// DOG-33: el contenido real del adjunto debe coincidir con el tipo declarado.

const PDF = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]); // %PDF-1.7
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");

describe("matchesClinicalAttachmentSignature", () => {
  it.each([
    ["application/pdf", PDF],
    ["image/png", PNG],
    ["image/jpeg", JPEG],
  ])("acepta un %s válido", (type, bytes) => {
    expect(matchesClinicalAttachmentSignature(bytes, type)).toBe(true);
  });

  it("rechaza contenido que no coincide con el tipo declarado", () => {
    expect(matchesClinicalAttachmentSignature(HTML, "application/pdf")).toBe(false);
    expect(matchesClinicalAttachmentSignature(PNG, "application/pdf")).toBe(false);
    expect(matchesClinicalAttachmentSignature(PDF, "image/jpeg")).toBe(false);
  });

  it("rechaza archivos vacíos o más cortos que la firma", () => {
    expect(matchesClinicalAttachmentSignature(new Uint8Array(), "application/pdf")).toBe(false);
    expect(matchesClinicalAttachmentSignature(PNG.slice(0, 4), "image/png")).toBe(false);
  });

  it("rechaza tipos no permitidos aunque el contenido sea válido", () => {
    expect(matchesClinicalAttachmentSignature(PDF, "text/html")).toBe(false);
  });
});

const mockRequireSession = vi.fn();
const mockPut = vi.fn();
const mockLogClinicalAccess = vi.fn();
const mockPrisma = {
  clinicalEpisode: { findFirst: vi.fn() },
  clinicalAttachment: { create: vi.fn() },
};

vi.mock("@prisma/client", () => ({ AccessLogAction: { VIEW: "VIEW", CREATE: "CREATE" } }));
vi.mock("@/lib/authz", () => ({ requireSession: () => mockRequireSession() }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => mockPrisma }));
vi.mock("@vercel/blob", () => ({ put: (...args: unknown[]) => mockPut(...args) }));
vi.mock("@/lib/clinical/access-log", () => ({ logClinicalAccess: () => mockLogClinicalAccess() }));
vi.mock("@/lib/clinical/access", () => ({ getProfessionalProfile: vi.fn() }));

async function postAttachment(file: File) {
  const { POST } = await import("@/app/api/clinical/episodes/[episodeId]/attachments/route");
  const formData = new FormData();
  formData.set("file", file);
  return POST(new Request("http://localhost/api/clinical/episodes/ep-1/attachments", { method: "POST", body: formData }), {
    params: Promise.resolve({ episodeId: "ep-1" }),
  });
}

describe("POST /api/clinical/episodes/[episodeId]/attachments — magic bytes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMINISTRADOR" } });
    mockPrisma.clinicalEpisode.findFirst.mockResolvedValue({ id: "ep-1", patientId: "pat-1", professionalId: "pro-1" });
    mockPut.mockImplementation(async (key: string) => ({ pathname: key }));
    mockPrisma.clinicalAttachment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "att-1",
      createdAt: new Date("2026-11-25T12:00:00.000Z"),
      ...data,
    }));
  });

  it.each([
    ["radiografia.pdf", "application/pdf", PDF],
    ["foto.png", "image/png", PNG],
    ["foto.jpg", "image/jpeg", JPEG],
  ])("sube %s cuando el contenido coincide", async (name, type, bytes) => {
    const response = await postAttachment(new File([bytes], name, { type }));

    expect(response.status).toBe(201);
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut.mock.calls[0][0]).toMatch(/^clinical-private\/ep-1\//);
  });

  it("rechaza con 400 un HTML renombrado como PDF y no lo sube", async () => {
    const response = await postAttachment(new File([HTML], "algo.pdf", { type: "application/pdf" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("El contenido del archivo no corresponde a un PDF, JPG o PNG válido.");
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockPrisma.clinicalAttachment.create).not.toHaveBeenCalled();
  });

  it("rechaza con 400 un archivo vacío", async () => {
    const response = await postAttachment(new File([], "vacio.pdf", { type: "application/pdf" }));

    expect(response.status).toBe(400);
    expect(mockPut).not.toHaveBeenCalled();
  });
});
