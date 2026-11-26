import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const checkBotIdMock = vi.hoisted(() => vi.fn());
vi.mock("botid/server", () => ({ checkBotId: checkBotIdMock }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { BOT_PROTECTED_ROUTES } from "@/lib/security/bot-protected-routes";
import { botBlockedResponse, isBotRequest } from "@/lib/security/bot-protection";

describe("isBotRequest (DOG-17)", () => {
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    checkBotIdMock.mockReset();
  });

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it("fuera de Vercel no consulta BotID y deja pasar", async () => {
    delete process.env.VERCEL;
    await expect(isBotRequest("/api/auth/register")).resolves.toBe(false);
    expect(checkBotIdMock).not.toHaveBeenCalled();
  });

  it("en Vercel bloquea cuando BotID detecta un bot", async () => {
    process.env.VERCEL = "1";
    checkBotIdMock.mockResolvedValue({ isBot: true, isHuman: false, isVerifiedBot: false, bypassed: false });
    await expect(isBotRequest("/api/auth/register")).resolves.toBe(true);
  });

  it("en Vercel deja pasar a un humano", async () => {
    process.env.VERCEL = "1";
    checkBotIdMock.mockResolvedValue({ isBot: false, isHuman: true, isVerifiedBot: false, bypassed: false });
    await expect(isBotRequest("/api/auth/register")).resolves.toBe(false);
  });

  it("si BotID falla, deja pasar (el rate limit sigue activo)", async () => {
    process.env.VERCEL = "1";
    checkBotIdMock.mockRejectedValue(new Error("VERCEL_OIDC_TOKEN is not set"));
    await expect(isBotRequest("/api/auth/register")).resolves.toBe(false);
  });

  it("responde 403 con un mensaje en español", async () => {
    const response = botBlockedResponse();
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/verificar tu solicitud/);
  });

  it("protege los cuatro formularios públicos con POST", () => {
    expect(BOT_PROTECTED_ROUTES.map((route) => route.path)).toEqual([
      "/api/auth/callback/credentials",
      "/api/auth/register",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
    ]);
    expect(BOT_PROTECTED_ROUTES.every((route) => route.method === "POST")).toBe(true);
  });
});
