import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { persistUploadFile, removePath, statSafe } from "@/lib/storage/files";

describe("storage/files", () => {
  let tmpDir = "";

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-storage-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("persists upload and avoids name collisions", async () => {
    const dir = path.join(tmpDir, "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "report.docx"), "existing");

    const saved = await persistUploadFile(
      dir,
      new File(["new-content"], "report.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        lastModified: 1234
      })
    );

    expect(saved.originalName).toBe("report.docx");
    expect(saved.lastModifiedMs).toBe(1234);
    expect(path.basename(saved.storedPath)).toBe("report-1.docx");
    const bytes = await fs.readFile(saved.storedPath, "utf8");
    expect(bytes).toBe("new-content");
  });

  it("statSafe returns file size and throws for missing file", async () => {
    const filePath = path.join(tmpDir, "out.bin");
    await fs.writeFile(filePath, "12345");
    expect(await statSafe(filePath)).toBe(5);
    await expect(statSafe(path.join(tmpDir, "missing.bin"))).rejects.toThrow("Output file is missing.");
  });

  it("removePath deletes directories recursively", async () => {
    const nested = path.join(tmpDir, "a", "b", "c.txt");
    await fs.mkdir(path.dirname(nested), { recursive: true });
    await fs.writeFile(nested, "x");
    await removePath(path.join(tmpDir, "a"));
    await expect(fs.stat(path.join(tmpDir, "a"))).rejects.toThrow();
  });
});
