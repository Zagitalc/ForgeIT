import { describe, expect, it } from "vitest";

import { getTabForTool, getToolLabel } from "@/lib/jobs/display";

describe("jobs display helpers", () => {
  it("maps tool labels", () => {
    expect(getToolLabel("word.docx_to_pdf")).toBe("Word -> PDF");
    expect(getToolLabel("pdf.merge")).toBe("Merge PDFs");
  });

  it("maps tool tabs", () => {
    expect(getTabForTool("pdf.rotate")).toBe("PDF");
    expect(getTabForTool("image.process")).toBe("Images");
    expect(getTabForTool("convert.markdown_docx")).toBe("Convert");
  });
});
