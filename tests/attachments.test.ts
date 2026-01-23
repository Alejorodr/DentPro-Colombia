import { describe, expect, it, vi } from "vitest";

import { uploadToBlob } from "@/lib/clinical/attachments";
import { sanitizeConsentHtml } from "@/lib/security/sanitize-html";

const mockPut = vi.fn();

vi.mock("@vercel/blob", () => ({
  put: mockPut,
}));

describe("clinical attachments helpers", () => {
  it("removes script tags and inline handlers from consent html", () => {
    const dirtyHtml =
      "<p>Consent</p><script>alert('x')</script><img src=\"x\" onerror=\"alert('y')\">";
    const cleaned = sanitizeConsentHtml(dirtyHtml);

    expect(cleaned).not.toContain("<script");
    expect(cleaned).not.toContain("onerror=");
    expect(cleaned).toContain("<p>Consent</p>");
  });

  it("uploads buffers to blob storage and returns a path", async () => {
    mockPut.mockResolvedValue({ pathname: "/clinical/episode-1/attachment.pdf" });
    const key = "clinical/episode-1/attachment.pdf";
    const content = Buffer.from("demo");

    const result = await uploadToBlob(content, key, "application/pdf");

    expect(result).toBe("/clinical/episode-1/attachment.pdf");
    expect(mockPut).toHaveBeenCalledWith(
      key,
      content,
      expect.objectContaining({ access: "public", addRandomSuffix: false, contentType: "application/pdf" }),
    );
  });
});
