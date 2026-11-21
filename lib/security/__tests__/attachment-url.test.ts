import { describe, expect, it } from "vitest";

import { isSafeAttachmentDataUrl, isSafeAttachmentUrl, sanitizeAttachmentLinks } from "@/lib/security/attachment-url";

describe("attachment link validation", () => {
  it("accepts only https URLs", () => {
    expect(isSafeAttachmentUrl("https://blob.example.com/x.pdf")).toBe(true);
    expect(isSafeAttachmentUrl("http://example.com/x.pdf")).toBe(false);
    expect(isSafeAttachmentUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeAttachmentUrl("not a url")).toBe(false);
  });

  it("accepts only base64 PDF/JPEG/PNG/WEBP data URLs", () => {
    expect(isSafeAttachmentDataUrl("data:application/pdf;base64,JVBERi0=")).toBe(true);
    expect(isSafeAttachmentDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isSafeAttachmentDataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isSafeAttachmentDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isSafeAttachmentDataUrl("data:image/png,<script>")).toBe(false);
  });

  it("rejects a data URL whose type does not match the declared mimeType", () => {
    expect(isSafeAttachmentDataUrl("data:image/png;base64,iVBORw0KGgo=", "application/pdf")).toBe(false);
  });

  it("nulls unsafe links on read", () => {
    const out = sanitizeAttachmentLinks({
      id: "a",
      url: "javascript:alert(1)",
      dataUrl: "data:text/html;base64,PHNjcmlwdD4=",
      mimeType: null,
    });
    expect(out).toEqual({ id: "a", url: null, dataUrl: null, mimeType: null });
  });
});
