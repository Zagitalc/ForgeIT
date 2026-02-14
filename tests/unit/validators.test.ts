import { describe, expect, it } from "vitest";

import { enforceFileLimits } from "@/lib/validators";

describe("enforceFileLimits", () => {
  it("accepts valid file counts and sizes", () => {
    const files = [new File(["hello"], "a.txt", { type: "text/plain" })];
    expect(() => enforceFileLimits(files)).not.toThrow();
  });

  it("rejects empty uploads", () => {
    expect(() => enforceFileLimits([])).toThrow(/At least one file/);
  });
});
