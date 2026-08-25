import { describe, expect, it } from "vitest";

import { getDefaultDashboardPath, resolveRoleAwarePortalPath } from "@/lib/auth/roles";

describe("role dashboard routing", () => {
  it("uses receptionist dashboard as default landing", () => {
    expect(getDefaultDashboardPath("RECEPCIONISTA")).toBe("/portal/receptionist/dashboard");
  });

  it("keeps callback when it belongs to the same role portal", () => {
    expect(resolveRoleAwarePortalPath("ADMINISTRADOR", "/portal/admin/staff")).toBe("/portal/admin/staff");
  });

  it("ignores callback that points to another role portal", () => {
    expect(resolveRoleAwarePortalPath("ADMINISTRADOR", "/portal/client")).toBe("/portal/admin");
  });

  it("keeps the shared booking callback with its query string", () => {
    expect(resolveRoleAwarePortalPath("PACIENTE", "/appointments/new?professionalId=abc-123")).toBe(
      "/appointments/new?professionalId=abc-123",
    );
  });

  it("still rejects non-allowlisted paths outside the role portal", () => {
    expect(resolveRoleAwarePortalPath("PACIENTE", "/portal/admin/users")).toBe("/portal/client");
  });

  it("normalizes absolute callback urls", () => {
    expect(resolveRoleAwarePortalPath("RECEPCIONISTA", "http://127.0.0.1:3000/portal/receptionist/schedule")).toBe(
      "/portal/receptionist/schedule",
    );
  });
});
