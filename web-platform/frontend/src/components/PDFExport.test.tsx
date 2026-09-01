import { describe, expect, it, vi } from "vitest";

import { exportHTMLToPDF, generatePDFTemplate } from "./PDFExport";

describe("PDF export sanitization", () => {
  it("sanitizes generated PDF templates", () => {
    const html = generatePDFTemplate({
      title: "Sample",
      content: "<script>alert(1)</script><p>Safe content</p>",
    });

    expect(html).toContain("Safe content");
    expect(html).not.toContain("<script");
  });

  it("opens a sanitized print window for exportHTMLToPDF", () => {
    const write = vi.fn();
    const close = vi.fn();
    const popup = {
      document: { write, close },
    } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(popup);

    exportHTMLToPDF('<script>alert(1)</script><p>Export safe</p>');

    const output = write.mock.calls[0]?.[0] as string;

    expect(open).toHaveBeenCalled();
    expect(output).toContain("Export safe");
    expect(output).not.toContain("<script>alert(1)</script>");
  });
});
