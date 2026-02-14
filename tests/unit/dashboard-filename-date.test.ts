import { describe, expect, it } from "vitest";

import { renderPatternPreview, truncateMiddle } from "@/components/Dashboard";

describe("Dashboard filename-date helpers", () => {
  it("truncates long filenames in the middle", () => {
    const value = "dec_H80707-020725-094930-0000657546-1.pdf";
    const truncated = truncateMiddle(value, 20);
    expect(truncated.length).toBeLessThanOrEqual(20);
    expect(truncated.includes("...")).toBe(true);
  });

  it("renders preview with filedate token", () => {
    const ms = new Date(2025, 6, 2, 9, 49, 30).getTime();
    const preview = renderPatternPreview("{filedate:YYYY-MM-DD}-{tool}-{index}", {
      original: "sample",
      tool: "pdf.merge",
      fileDateMs: ms
    });

    expect(preview).toContain("2025-07-02-pdf.merge-1");
  });
});
