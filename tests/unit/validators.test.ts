import { describe, expect, it } from "vitest";

import { assertExtension, enforceFileLimits } from "@/lib/validators";

describe("enforceFileLimits", () => {
  it("accepts valid file counts and sizes", () => {
    const files = [new File(["hello"], "a.txt", { type: "text/plain" })];
    expect(() => enforceFileLimits(files)).not.toThrow();
  });

  it("rejects empty uploads", () => {
    expect(() => enforceFileLimits([])).toThrow(/At least one file/);
  });

  it("rejects files above max per-file size", () => {
    const oversized = new File([new Uint8Array(51 * 1024 * 1024)], "big.pdf", {
      type: "application/pdf"
    });
    expect(() => enforceFileLimits([oversized])).toThrow(/exceeds maximum size/);
  });

  it("rejects total upload size above max", () => {
    const size = 45 * 1024 * 1024;
    const files = [
      new File([new Uint8Array(size)], "a.bin"),
      new File([new Uint8Array(size)], "b.bin"),
      new File([new Uint8Array(size)], "c.bin"),
      new File([new Uint8Array(size)], "d.bin"),
      new File([new Uint8Array(size)], "e.bin")
    ];
    expect(() => enforceFileLimits(files)).toThrow(/Total upload size exceeds/);
  });
});

describe("assertExtension", () => {
  it("accepts allowed extensions case-insensitively", () => {
    expect(() => assertExtension("Report.DOCX", ["docx"])).not.toThrow();
  });

  it("rejects unsupported extensions", () => {
    expect(() => assertExtension("photo.gif", ["png", "jpg"])).toThrow(/Unsupported file type/);
  });
});
