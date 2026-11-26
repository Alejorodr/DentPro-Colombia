import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";

import { scrubSentryEvent } from "@/lib/monitoring/sentry-scrub";
import { sanitizeValue } from "@/lib/logger";

function baseEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return { type: undefined, ...overrides } as ErrorEvent;
}

describe("scrubSentryEvent", () => {
  it("descarta cuerpo, cookies, query y encabezados que identifican", () => {
    const event = scrubSentryEvent(
      baseEvent({
        request: {
          url: "https://dentpro.co/api/patients?documento=123",
          data: { allergies: "penicilina" },
          cookies: { session: "abc" },
          query_string: "documento=123",
          headers: { authorization: "Bearer x", cookie: "s=1", "user-agent": "UA", "x-forwarded-for": "1.2.3.4" },
        },
      }),
    );

    expect(event.request?.url).toBe("https://dentpro.co/api/patients");
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.query_string).toBeUndefined();
    expect(event.request?.headers).toEqual({ "user-agent": "UA" });
  });

  it("deja solo el id del usuario", () => {
    const event = scrubSentryEvent(
      baseEvent({ user: { id: "u1", email: "ana@correo.co", ip_address: "1.2.3.4", username: "ana" } }),
    );
    expect(event.user).toEqual({ id: "u1" });
  });

  it("enmascara correos y teléfonos en mensajes y excepciones", () => {
    const event = scrubSentryEvent(
      baseEvent({
        message: "Falló el envío a ana@correo.co",
        exception: { values: [{ type: "Error", value: "Teléfono +57 323 796 8435 inválido" }] },
      }),
    );
    expect(event.message).not.toContain("ana@correo.co");
    expect(event.exception?.values?.[0]?.value).not.toContain("323 796 8435");
  });

  it("redacta datos clínicos en extra, contextos y breadcrumbs", () => {
    const event = scrubSentryEvent(
      baseEvent({
        extra: { allergies: "penicilina", appointmentId: "a1" },
        contexts: { patient: { diagnosis: "caries", documentNumber: "1020" } },
        breadcrumbs: [{ message: "ok", data: { clinicalNotes: "dolor" } }],
      }),
    );
    expect(event.extra).toEqual({ allergies: "[REDACTED]", appointmentId: "a1" });
    expect(event.contexts?.patient).toEqual({ diagnosis: "[REDACTED]", documentNumber: "[REDACTED]" });
    expect(event.breadcrumbs?.[0]?.data).toEqual({ clinicalNotes: "[REDACTED]" });
  });
});

describe("logger sanitizeValue", () => {
  it("redacta campos clínicos y de identidad", () => {
    expect(
      sanitizeValue({ prescription: "x", insuranceProvider: "y", consentHtml: "<p>", status: "confirmed" }),
    ).toEqual({ prescription: "[REDACTED]", insuranceProvider: "[REDACTED]", consentHtml: "[REDACTED]", status: "confirmed" });
  });
});
