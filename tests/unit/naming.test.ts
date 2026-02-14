import { describe, expect, it } from "vitest";

import { buildOutputFileName } from "@/lib/jobs/naming";

describe("buildOutputFileName", () => {
  it("renders placeholders with defaults", () => {
    const name = buildOutputFileName({
      originalName: "draft.docx",
      index: 0,
      tool: "word.docx_to_pdf",
      outputExt: "pdf"
    });

    expect(name).toContain("draft-word.docx_to_pdf-1");
    expect(name.endsWith(".pdf")).toBe(true);
  });

  it("supports custom date placeholder", () => {
    const name = buildOutputFileName({
      pattern: "{date:YYYY-MM-DD}-{original}",
      originalName: "file.md",
      index: 0,
      tool: "convert.markdown_docx",
      outputExt: "docx"
    });

    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-file\.docx$/);
  });

  it("supports filedate placeholder from extracted timestamp context", () => {
    const name = buildOutputFileName({
      pattern: "{filedate:YYYY-MM-DD}-{original}-{index}",
      originalName: "dec_H80707-020725-094930-0000657546-1.pdf",
      index: 1,
      tool: "pdf.merge",
      outputExt: "pdf",
      fileDateMs: new Date(2025, 6, 2, 9, 49, 30).getTime()
    });

    expect(name).toBe("2025-07-02-dec_H80707-020725-094930-0000657546-1-2.pdf");
  });
});
