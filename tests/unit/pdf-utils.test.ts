import { describe, expect, it } from "vitest";

import { parsePageRanges } from "@/lib/pdf/utils";

describe("parsePageRanges", () => {
  it("parses range and discrete pages", () => {
    expect(parsePageRanges("1,3-4", 5)).toEqual([0, 2, 3]);
  });

  it("ignores out-of-bounds pages", () => {
    expect(parsePageRanges("1,10", 2)).toEqual([0]);
  });
});
