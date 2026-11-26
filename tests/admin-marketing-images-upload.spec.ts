// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { POST } from "@/app/api/admin/marketing-images/upload/route";

// Cabecera mínima de un WEBP real: "RIFF" + tamaño + "WEBPVP8 ".
const WEBP_HEADER = new Uint8Array([...new TextEncoder().encode("RIFF"), 0x24, 0, 0, 0, ...new TextEncoder().encode("WEBPVP8 ")]);

const { requireAdminMock, uploadPublicMarketingImageMock, logAuditEventMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  uploadPublicMarketingImageMock: vi.fn(),
  logAuditEventMock: vi.fn(),
}));

vi.mock("@/app/api/admin/homepage/_lib", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/marketing/images", async () => ({
  // La verificación de firma es la real (DOG-19): es justo lo que se quiere probar.
  matchesMarketingImageSignature: (await vi.importActual<typeof import("@/lib/marketing/images")>("@/lib/marketing/images"))
    .matchesMarketingImageSignature,
  MARKETING_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  buildMarketingImageStorageKey: vi.fn((folder: string, fileName: string) => `${folder}/${fileName}`),
  isAllowedMarketingImageType: vi.fn((type: string) => ["image/jpeg", "image/png", "image/webp"].includes(type)),
  isAllowedMarketingUploadFolder: vi.fn((folder: string) => ["homepage", "campaigns"].includes(folder)),
  sanitizeMarketingImageFilename: vi.fn((name: string) => name.replace(/\s+/g, "-")),
  uploadPublicMarketingImage: uploadPublicMarketingImageMock,
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: logAuditEventMock,
}));

describe("POST /api/admin/marketing-images/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ ok: true, sessionUser: { id: "admin-1", role: "ADMINISTRADOR" } });
    uploadPublicMarketingImageMock.mockResolvedValue("https://cdn.example.com/homepage/hero.webp");
  });

  it("rechaza sin sesión", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 401 }),
    });

    const response = await POST(new Request("http://localhost/api/admin/marketing-images/upload", { method: "POST" }));

    expect(response.status).toBe(401);
  });

  it("rechaza sin rol admin", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    });

    const response = await POST(new Request("http://localhost/api/admin/marketing-images/upload", { method: "POST" }));

    expect(response.status).toBe(403);
  });

  it("rechaza MIME inválido", async () => {
    const formData = new FormData();
    formData.append("folder", "homepage");
    formData.append("file", new File([new Uint8Array([1, 2, 3])], "hero.svg", { type: "image/svg+xml" }));

    const response = await POST(
      new Request("http://localhost/api/admin/marketing-images/upload", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Tipo de archivo no permitido");
  });

  it("rechaza input inválido cuando file no es archivo", async () => {
    const formData = new FormData();
    formData.append("folder", "homepage");
    formData.append("file", "not-a-file");

    const response = await POST(
      new Request("http://localhost/api/admin/marketing-images/upload", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rechaza tamaño inválido", async () => {
    const formData = new FormData();
    formData.append("folder", "homepage");
    formData.append("file", new File([], "empty.png", { type: "image/png" }));

    const response = await POST(
      new Request("http://localhost/api/admin/marketing-images/upload", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
  });

  it("acepta upload válido y responde 201", async () => {
    const formData = new FormData();
    formData.append("folder", "homepage");
    formData.append("file", new File([WEBP_HEADER], "hero image.webp", { type: "image/webp" }));

    const response = await POST(
      new Request("http://localhost/api/admin/marketing-images/upload", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.url).toContain("https://cdn.example.com");
    expect(uploadPublicMarketingImageMock).toHaveBeenCalledTimes(1);
    expect(logAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "marketing.image.uploaded",
        resourceType: "marketing_image_upload",
        status: "success",
      }),
    );
  });

  it("rechaza con 400 un archivo cuyo contenido no es la imagen declarada (DOG-19)", async () => {
    const formData = new FormData();
    formData.append("folder", "homepage");
    const html = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
    formData.append("file", new File([html], "hero.png", { type: "image/png" }));

    const response = await POST(
      new Request("http://localhost/api/admin/marketing-images/upload", { method: "POST", body: formData }),
    );

    expect(response.status).toBe(400);
    expect(uploadPublicMarketingImageMock).not.toHaveBeenCalled();
  });

  it("rechaza con 400 un body que no es multipart (DOG-19)", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/marketing-images/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: "x" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
