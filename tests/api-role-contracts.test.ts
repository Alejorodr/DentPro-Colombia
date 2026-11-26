// @vitest-environment node
/**
 * DOG-22: contrato de autorización por rol para las APIs críticas.
 *
 * Llama al handler real de cada endpoint con cada rol y sin sesión. Solo se simulan
 * `auth()` (la sesión) y la base de datos. Para cada endpoint se espera:
 *   - sin sesión → 401, sin tocar la base;
 *   - rol no permitido → 403, sin tocar la base;
 *   - rol permitido → pasa la autorización (cualquier código distinto de 401/403).
 *
 * Si cambias los roles de un endpoint, actualiza esta tabla a propósito.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserRole } from "@/lib/auth/roles";

const { authMock, dbCalls, prismaMock } = vi.hoisted(() => {
  const dbCalls: string[] = [];

  function resultFor(operation: string) {
    if (operation === "findMany" || operation === "groupBy" || operation === "createManyAndReturn") return [];
    if (operation === "count") return 0;
    if (operation === "aggregate") return { _count: 0, _sum: {}, _avg: {}, _min: {}, _max: {} };
    if (operation.startsWith("find")) return null;
    if (operation.endsWith("Many")) return { count: 0 };
    return {};
  }

  // Cliente falso: cualquier `prisma.<modelo>.<operación>()` responde algo vacío y queda registrado.
  const prismaMock: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, key: string) {
        if (key === "then") return undefined;
        if (key === "$transaction") {
          return async (input: unknown) => {
            dbCalls.push("$transaction");
            if (Array.isArray(input)) return Promise.all(input);
            return (input as (tx: unknown) => unknown)(prismaMock);
          };
        }
        if (key.startsWith("$")) {
          return async () => {
            dbCalls.push(key);
            return [];
          };
        }
        return new Proxy(
          {},
          {
            get(_model, operation: string) {
              if (operation === "then") return undefined;
              return async () => {
                dbCalls.push(`${key}.${operation}`);
                return resultFor(operation);
              };
            },
          },
        );
      },
    },
  );

  return { authMock: vi.fn(), dbCalls, prismaMock };
});

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => prismaMock,
  isDatabaseUnavailableError: () => false,
}));
vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn(async () => undefined) }));

const ALL_ROLES: UserRole[] = ["PACIENTE", "PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"];

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

type Contract = {
  endpoint: string;
  load: () => Promise<Record<string, unknown>>;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  params?: Record<string, string>;
  allowed: UserRole[];
};

const ID = "00000000-0000-4000-8000-000000000001";

const CONTRACTS: Contract[] = [
  // Administración
  { endpoint: "GET /api/users", load: () => import("@/app/api/users/route"), method: "GET", path: "/api/users", allowed: ["ADMINISTRADOR"] },
  { endpoint: "POST /api/users", load: () => import("@/app/api/users/route"), method: "POST", path: "/api/users", allowed: ["ADMINISTRADOR"] },
  { endpoint: "GET /api/admin/audit/access-logs", load: () => import("@/app/api/admin/audit/access-logs/route"), method: "GET", path: "/api/admin/audit/access-logs", allowed: ["ADMINISTRADOR"] },
  { endpoint: "GET /api/admin/patients/[id]/export", load: () => import("@/app/api/admin/patients/[id]/export/route"), method: "GET", path: `/api/admin/patients/${ID}/export`, params: { id: ID }, allowed: ["ADMINISTRADOR"] },
  { endpoint: "GET /api/admin/templates", load: () => import("@/app/api/admin/templates/route"), method: "GET", path: "/api/admin/templates", allowed: ["ADMINISTRADOR"] },
  { endpoint: "POST /api/admin/templates", load: () => import("@/app/api/admin/templates/route"), method: "POST", path: "/api/admin/templates", allowed: ["ADMINISTRADOR"] },
  { endpoint: "POST /api/admin/holidays", load: () => import("@/app/api/admin/holidays/route"), method: "POST", path: "/api/admin/holidays", allowed: ["ADMINISTRADOR"] },
  { endpoint: "POST /api/admin/homepage/faqs", load: () => import("@/app/api/admin/homepage/faqs/route"), method: "POST", path: "/api/admin/homepage/faqs", allowed: ["ADMINISTRADOR"] },
  { endpoint: "POST /api/campaigns", load: () => import("@/app/api/campaigns/route"), method: "POST", path: "/api/campaigns", allowed: ["ADMINISTRADOR"] },
  { endpoint: "GET /api/analytics/admin", load: () => import("@/app/api/analytics/admin/route"), method: "GET", path: "/api/analytics/admin", allowed: ["ADMINISTRADOR"] },
  { endpoint: "DELETE /api/patients/[id]", load: () => import("@/app/api/patients/[id]/route"), method: "DELETE", path: `/api/patients/${ID}`, params: { id: ID }, allowed: ["ADMINISTRADOR"] },

  // Recepción
  { endpoint: "GET /api/patients", load: () => import("@/app/api/patients/route"), method: "GET", path: "/api/patients", allowed: ["RECEPCIONISTA", "ADMINISTRADOR"] },
  { endpoint: "POST /api/patients", load: () => import("@/app/api/patients/route"), method: "POST", path: "/api/patients", allowed: ["RECEPCIONISTA", "ADMINISTRADOR"] },
  { endpoint: "PATCH /api/patients/[id]", load: () => import("@/app/api/patients/[id]/route"), method: "PATCH", path: `/api/patients/${ID}`, params: { id: ID }, allowed: ["RECEPCIONISTA", "ADMINISTRADOR"] },
  { endpoint: "GET /api/analytics/receptionist", load: () => import("@/app/api/analytics/receptionist/route"), method: "GET", path: "/api/analytics/receptionist", allowed: ["RECEPCIONISTA", "ADMINISTRADOR"] },

  // Paciente
  { endpoint: "GET /api/client/dashboard", load: () => import("@/app/api/client/dashboard/route"), method: "GET", path: "/api/client/dashboard", allowed: ["PACIENTE"] },
  { endpoint: "GET /api/client/data-export", load: () => import("@/app/api/client/data-export/route"), method: "GET", path: "/api/client/data-export", allowed: ["PACIENTE"] },
  { endpoint: "POST /api/client/appointments", load: () => import("@/app/api/client/appointments/route"), method: "POST", path: "/api/client/appointments", allowed: ["PACIENTE"] },

  // Profesional
  { endpoint: "GET /api/professional/dashboard", load: () => import("@/app/api/professional/dashboard/route"), method: "GET", path: "/api/professional/dashboard", allowed: ["PROFESIONAL"] },
  { endpoint: "GET /api/professional/patients", load: () => import("@/app/api/professional/patients/route"), method: "GET", path: "/api/professional/patients", allowed: ["PROFESIONAL"] },

  // Clínica: solo profesional y administrador
  { endpoint: "GET /api/clinical/episodes/[episodeId]/notes", load: () => import("@/app/api/clinical/episodes/[episodeId]/notes/route"), method: "GET", path: `/api/clinical/episodes/${ID}/notes`, params: { episodeId: ID }, allowed: ["PROFESIONAL", "ADMINISTRADOR"] },
  { endpoint: "POST /api/clinical/episodes/[episodeId]/notes", load: () => import("@/app/api/clinical/episodes/[episodeId]/notes/route"), method: "POST", path: `/api/clinical/episodes/${ID}/notes`, params: { episodeId: ID }, allowed: ["PROFESIONAL", "ADMINISTRADOR"] },
  { endpoint: "POST /api/clinical/patients/[patientId]/episodes", load: () => import("@/app/api/clinical/patients/[patientId]/episodes/route"), method: "POST", path: `/api/clinical/patients/${ID}/episodes`, params: { patientId: ID }, allowed: ["PROFESIONAL", "ADMINISTRADOR"] },
];

function sessionFor(role: UserRole | null) {
  return role ? { user: { id: `user-${role.toLowerCase()}`, role } } : null;
}

async function call(contract: Contract, role: UserRole | null) {
  authMock.mockResolvedValue(sessionFor(role));
  const routeModule = await contract.load();
  const handler = routeModule[contract.method] as Handler | undefined;
  if (!handler) throw new Error(`${contract.endpoint}: el módulo no exporta ${contract.method}`);

  const hasBody = contract.method !== "GET" && contract.method !== "DELETE";
  const request = new Request(`http://localhost${contract.path}`, {
    method: contract.method,
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? "{}" : undefined,
  });
  return handler(request, { params: Promise.resolve(contract.params ?? {}) });
}

beforeEach(() => {
  dbCalls.length = 0;
  authMock.mockReset();
});

describe.each(CONTRACTS)("$endpoint", (contract) => {
  it("sin sesión responde 401 sin tocar la base", async () => {
    const response = await call(contract, null);
    expect(response.status).toBe(401);
    expect(dbCalls).toEqual([]);
  });

  const denied = ALL_ROLES.filter((role) => !contract.allowed.includes(role));
  if (denied.length > 0) {
    it.each(denied)("%s recibe 403 sin tocar la base", async (role) => {
      const response = await call(contract, role);
      expect(response.status).toBe(403);
      expect(dbCalls).toEqual([]);
    });
  }

  it.each(contract.allowed)("%s pasa la autorización", async (role) => {
    const response = await call(contract, role);
    expect([401, 403]).not.toContain(response.status);
  });
});

describe("acceso del paciente a episodios clínicos", () => {
  const load = () => import("@/app/api/clinical/patients/[patientId]/episodes/route");

  it("recepción no puede leer episodios clínicos", async () => {
    authMock.mockResolvedValue(sessionFor("RECEPCIONISTA"));
    const { GET } = await load();
    const response = await GET(new Request(`http://localhost/api/clinical/patients/${ID}/episodes`), {
      params: Promise.resolve({ patientId: ID }),
    });
    expect(response.status).toBe(403);
    expect(dbCalls).toEqual([]);
  });

  it("un paciente no puede leer los episodios de otro paciente", async () => {
    authMock.mockResolvedValue(sessionFor("PACIENTE"));
    const { GET } = await load();
    // La base no encuentra un perfil de paciente que coincida con patientId.
    const response = await GET(new Request(`http://localhost/api/clinical/patients/${ID}/episodes`), {
      params: Promise.resolve({ patientId: ID }),
    });
    expect(response.status).toBe(403);
  });
});
