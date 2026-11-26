import { describe, expect, it } from "vitest";

import { hasConfiguredAuthSecret, readConfiguredAuthSecret } from "@/lib/auth/secret";

describe("readConfiguredAuthSecret", () => {
  it("prioriza AUTH_JWT_SECRET sobre NEXTAUTH_SECRET y AUTH_SECRET", () => {
    expect(
      readConfiguredAuthSecret({ AUTH_JWT_SECRET: "jwt", NEXTAUTH_SECRET: "next", AUTH_SECRET: "auth" }),
    ).toBe("jwt");
  });

  it("usa NEXTAUTH_SECRET cuando AUTH_JWT_SECRET está vacía (DOG-6)", () => {
    expect(readConfiguredAuthSecret({ AUTH_JWT_SECRET: "", NEXTAUTH_SECRET: "next" })).toBe("next");
  });

  it("trata un valor solo con espacios como ausente", () => {
    expect(readConfiguredAuthSecret({ AUTH_JWT_SECRET: "   ", NEXTAUTH_SECRET: "", AUTH_SECRET: "auth" })).toBe(
      "auth",
    );
  });

  it("devuelve undefined si ninguna variable tiene valor", () => {
    expect(readConfiguredAuthSecret({ AUTH_JWT_SECRET: "", NEXTAUTH_SECRET: " " })).toBeUndefined();
    expect(hasConfiguredAuthSecret({})).toBe(false);
  });
});
