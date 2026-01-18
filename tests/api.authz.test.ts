import { describe, expect, it } from "vitest";

import { requireOwnershipOrRole, requireRole } from "@/lib/authz";

describe("authz helpers", () => {
  it("allows roles that match", () => {
    const user = { id: "user-1", role: "PACIENTE" as const };
    const result = requireRole(user, ["PACIENTE"]);
    expect(result).toBeNull();
  });

  it("blocks roles that do not match", () => {
    const user = { id: "user-1", role: "PACIENTE" as const };
    const result = requireRole(user, ["ADMINISTRADOR"]);
    expect(result).toEqual({ status: 403, message: "No autorizado." });
  });

  it("allows ownership or privileged role", () => {
    const owner = { id: "user-1", role: "PACIENTE" as const };
    const admin = { id: "admin-1", role: "ADMINISTRADOR" as const };
    expect(
      requireOwnershipOrRole({ user: owner, ownerId: "user-1", rolesAllowed: ["ADMINISTRADOR"] }),
    ).toBeNull();
    expect(
      requireOwnershipOrRole({ user: admin, ownerId: "user-2", rolesAllowed: ["ADMINISTRADOR"] }),
    ).toBeNull();
  });

  it("blocks when not owner or privileged", () => {
    const user = { id: "user-1", role: "PACIENTE" as const };
    const result = requireOwnershipOrRole({ user, ownerId: "user-2", rolesAllowed: ["ADMINISTRADOR"] });
    expect(result).toEqual({ status: 403, message: "No autorizado." });
  });
});
