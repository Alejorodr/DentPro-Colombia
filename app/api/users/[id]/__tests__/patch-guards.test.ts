import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/users/[id]/route";

const ADMIN_ID = randomUUID();
const OTHER_USER_ID = randomUUID();

const { requireSessionMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  requireRoleMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    patientProfile: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    professionalProfile: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireSession: requireSessionMock,
  requireRole: requireRoleMock,
}));
vi.mock("@/lib/prisma", () => ({ getPrismaClient: () => prismaMock }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/security/redaction", () => ({ redactSensitiveAuthFields: (v: unknown) => v }));

const ADMIN_SESSION = { user: { id: ADMIN_ID, role: "ADMINISTRADOR" as const } };

function makeExisting(overrides: Record<string, unknown> = {}) {
  return {
    id: OTHER_USER_ID,
    role: "PACIENTE",
    active: true,
    patient: null,
    professional: null,
    ...overrides,
  };
}

async function callPatch(targetId: string, body: Record<string, unknown>) {
  return PATCH(
    new Request(`http://localhost/api/users/${targetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: targetId }) },
  );
}

describe("PATCH /api/users/[id] guards", () => {
  beforeEach(() => {
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.user.update.mockResolvedValue({ id: OTHER_USER_ID, role: "PACIENTE", active: true });
  });

  it("rejects self-role-change with 403", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ id: ADMIN_ID, role: "ADMINISTRADOR" }));
    const res = await callPatch(ADMIN_ID, { role: "PACIENTE" });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/propio rol/);
  });

  it("rejects self-deactivation with 403", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ id: ADMIN_ID, role: "ADMINISTRADOR" }));
    const res = await callPatch(ADMIN_ID, { active: false });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/desactivarte/);
  });

  it("rejects demoting the last ADMINISTRADOR with 400", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ role: "ADMINISTRADOR" }));
    prismaMock.user.count.mockResolvedValue(0);
    const res = await callPatch(OTHER_USER_ID, { role: "PACIENTE" });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/único administrador/);
  });

  it("rejects deactivating the last ADMINISTRADOR with 400", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ role: "ADMINISTRADOR" }));
    prismaMock.user.count.mockResolvedValue(0);
    const res = await callPatch(OTHER_USER_ID, { active: false });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/único administrador/);
  });

  it("allows demoting an ADMINISTRADOR when others exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting({ role: "ADMINISTRADOR" }));
    prismaMock.user.count.mockResolvedValue(1);
    const res = await callPatch(OTHER_USER_ID, { role: "RECEPCIONISTA" });
    expect(res.status).toBe(200);
  });

  it("records password changes for session invalidation", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeExisting());
    const res = await callPatch(OTHER_USER_ID, { password: "NewSecure1!" });

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        passwordHash: expect.any(String),
        passwordChangedAt: expect.any(Date),
      }),
    }));
  });
});

describe("PATCH /api/users/[id] role change keeps profiles (soft deactivation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue(ADMIN_SESSION);
    requireRoleMock.mockReturnValue(null);
    prismaMock.user.count.mockResolvedValue(2);
  });

  it("PROFESIONAL → RECEPCIONISTA deactivates the professional profile and never deletes it", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      makeExisting({ role: "PROFESIONAL", professional: { id: "prof-1", active: true } }),
    );
    prismaMock.user.update.mockResolvedValue({ id: OTHER_USER_ID, role: "RECEPCIONISTA", active: true });

    const res = await callPatch(OTHER_USER_ID, { role: "RECEPCIONISTA" });

    expect(res.status).toBe(200);
    expect(prismaMock.professionalProfile.update).toHaveBeenCalledWith({
      where: { userId: OTHER_USER_ID },
      data: { active: false },
    });
    expect(prismaMock.professionalProfile.delete).not.toHaveBeenCalled();
    expect(prismaMock.patientProfile.delete).not.toHaveBeenCalled();
  });

  it("PACIENTE → RECEPCIONISTA deactivates the patient profile and never deletes it", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      makeExisting({ role: "PACIENTE", patient: { id: "pat-1", active: true } }),
    );
    prismaMock.user.update.mockResolvedValue({ id: OTHER_USER_ID, role: "RECEPCIONISTA", active: true });

    const res = await callPatch(OTHER_USER_ID, { role: "RECEPCIONISTA" });

    expect(res.status).toBe(200);
    expect(prismaMock.patientProfile.update).toHaveBeenCalledWith({
      where: { userId: OTHER_USER_ID },
      data: { active: false },
    });
    expect(prismaMock.patientProfile.delete).not.toHaveBeenCalled();
  });

  it("switching back to PACIENTE reactivates the existing profile instead of creating a duplicate", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      makeExisting({ role: "RECEPCIONISTA", patient: { id: "pat-1", active: false } }),
    );
    prismaMock.user.update.mockResolvedValue({ id: OTHER_USER_ID, role: "PACIENTE", active: true });

    const res = await callPatch(OTHER_USER_ID, { role: "PACIENTE" });

    expect(res.status).toBe(200);
    expect(prismaMock.patientProfile.create).not.toHaveBeenCalled();
    expect(prismaMock.patientProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: OTHER_USER_ID },
      data: expect.objectContaining({ active: true }),
    }));
  });

  it("switching back to PROFESIONAL reactivates the existing profile instead of creating a duplicate", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      makeExisting({ role: "RECEPCIONISTA", professional: { id: "prof-1", active: false } }),
    );
    prismaMock.user.update.mockResolvedValue({ id: OTHER_USER_ID, role: "PROFESIONAL", active: true });

    const res = await callPatch(OTHER_USER_ID, { role: "PROFESIONAL" });

    expect(res.status).toBe(200);
    expect(prismaMock.professionalProfile.create).not.toHaveBeenCalled();
    expect(prismaMock.professionalProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: OTHER_USER_ID },
      data: expect.objectContaining({ active: true }),
    }));
  });

  it("deactivating a PROFESIONAL user also deactivates the professional profile", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      makeExisting({ role: "PROFESIONAL", professional: { id: "prof-1", active: true } }),
    );
    prismaMock.user.update.mockResolvedValue({ id: OTHER_USER_ID, role: "PROFESIONAL", active: false });

    const res = await callPatch(OTHER_USER_ID, { active: false });

    expect(res.status).toBe(200);
    expect(prismaMock.professionalProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ active: false }),
    }));
  });
});
