import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createTransportMock, sendMailMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  return { sendMailMock, createTransportMock: vi.fn(() => ({ sendMail: sendMailMock, close: vi.fn() })) };
});

vi.mock("nodemailer", () => ({ default: { createTransport: createTransportMock } }));

import { deliverEmail, PermanentEmailError } from "@/lib/email";

const payload = { to: "a@b.co", subject: "Hola", html: "<p>Hola</p>" };

beforeEach(() => {
  vi.stubEnv("SMTP_HOST", "smtp.test");
  vi.stubEnv("SMTP_PORT", "587");
  vi.stubEnv("SMTP_USER", "user");
  vi.stubEnv("SMTP_PASS", "pass");
  vi.stubEnv("EMAIL_FROM", "DentPro <no-reply@dentpro.test>");
  vi.stubEnv("RESEND_API_KEY", "re_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SMTP", () => {
  it("configura timeouts explícitos", async () => {
    sendMailMock.mockResolvedValue({});
    await deliverEmail("smtp", payload);
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 }),
    );
  });

  it("una respuesta 5xx es definitiva y una 4xx no", async () => {
    sendMailMock.mockRejectedValueOnce(Object.assign(new Error("mailbox unavailable"), { responseCode: 550 }));
    await expect(deliverEmail("smtp", payload)).rejects.toBeInstanceOf(PermanentEmailError);

    sendMailMock.mockRejectedValueOnce(Object.assign(new Error("try later"), { responseCode: 421 }));
    const error = await deliverEmail("smtp", payload).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(PermanentEmailError);
  });
});

describe("Resend", () => {
  it("un 422 es definitivo y un 503 se reintenta", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("invalid", { status: 422 })).mockResolvedValueOnce(new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deliverEmail("resend", payload)).rejects.toBeInstanceOf(PermanentEmailError);
    const error = await deliverEmail("resend", payload).catch((caught: unknown) => caught);
    expect(error).not.toBeInstanceOf(PermanentEmailError);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
