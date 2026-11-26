// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/users/route";

// DOG-34: el alta de usuarios guarda el tipo de documento del paciente y el RETHUS del profesional.

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: { user: { create: vi.fn() } },
}));

vi.mock("@/lib/authz", () => ({ requireSession: requireSessionMock, requireRole: requireRoleMock }));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/app/api/_utils/observability", () => ({ logApiError: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "hash") } }));

const BASE = { email: "nuevo@dentpro.co", password: "Segura!2026", name: "Ana", lastName: "Ruiz" };
const SPECIALTY_ID = "8b0b6f4e-1c55-4a7a-9d0b-5d4f4a7f1a11";

const post = (body: Record<string, unknown>) =>
  POST(
    new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...BASE, ...body }),
    }),
  );

type CreateArgs = { data: { patient?: { create: Record<string, unknown> }; professional?: { create: Record<string, unknown> } } };
const createArgs = () => prismaMock.user.create.mock.calls[0][0] as CreateArgs;

describe("POST /api/users — campos de normativa colombiana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMINISTRADOR" } });
    requireRoleMock.mockReturnValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u-1", email: BASE.email });
  });

  it("guarda el tipo de documento del paciente", async () => {
    const response = await post({ role: "PACIENTE", documentType: "TI", documentId: "1002003004" });

    expect(response.status).toBe(201);
    expect(createArgs().data.patient?.create).toMatchObject({ documentType: "TI", documentId: "1002003004" });
  });

  it("rechaza un tipo de documento que no está en la tabla RIPS", async () => {
    const response = await post({ role: "PACIENTE", documentType: "XX", documentId: "123" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("crea un profesional sin RETHUS (es opcional)", async () => {
    const response = await post({ role: "PROFESIONAL", specialtyId: SPECIALTY_ID });

    expect(response.status).toBe(201);
    expect(createArgs().data.professional?.create).toMatchObject({ rethusNumber: null });
  });

  it("guarda el RETHUS normalizado", async () => {
    const response = await post({ role: "PROFESIONAL", specialtyId: SPECIALTY_ID, rethusNumber: " od 2019 44 " });

    expect(response.status).toBe(201);
    expect(createArgs().data.professional?.create).toMatchObject({ rethusNumber: "OD201944" });
  });

  it("rechaza un RETHUS con caracteres no permitidos", async () => {
    const response = await post({ role: "PROFESIONAL", specialtyId: SPECIALTY_ID, rethusNumber: "12<b>" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
