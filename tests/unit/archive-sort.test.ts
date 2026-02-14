import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createOutputZip, sortZipEntriesForTest } from "@/lib/jobs/archive";

describe("sortZipEntriesForTest", () => {
  const outputPaths = ["/tmp/b.pdf", "/tmp/a.pdf", "/tmp/c.pdf"];
  const inputNames = ["b.docx", "a.docx", "c.docx"];

  it("sorts by name ascending", () => {
    const sorted = sortZipEntriesForTest({
      outputPaths,
      inputNames,
      tool: "word.docx_to_pdf",
      options: { outputSortBy: "name", outputSortDirection: "asc" }
    });

    expect(sorted).toEqual(["/tmp/a.pdf", "/tmp/b.pdf", "/tmp/c.pdf"]);
  });

  it("sorts by name descending", () => {
    const sorted = sortZipEntriesForTest({
      outputPaths,
      inputNames,
      tool: "word.docx_to_pdf",
      options: { outputSortBy: "name", outputSortDirection: "desc" }
    });

    expect(sorted).toEqual(["/tmp/c.pdf", "/tmp/b.pdf", "/tmp/a.pdf"]);
  });

  it("sorts by date ascending", () => {
    const sorted = sortZipEntriesForTest({
      outputPaths,
      inputNames,
      sourceModifieds: [30, 10, 20],
      tool: "word.docx_to_pdf",
      options: { outputSortBy: "date", outputSortDirection: "asc" }
    });

    expect(sorted).toEqual(["/tmp/a.pdf", "/tmp/c.pdf", "/tmp/b.pdf"]);
  });

  it("sorts by date descending", () => {
    const sorted = sortZipEntriesForTest({
      outputPaths,
      inputNames,
      sourceModifieds: [30, 10, 20],
      tool: "word.docx_to_pdf",
      options: { outputSortBy: "date", outputSortDirection: "desc" }
    });

    expect(sorted).toEqual(["/tmp/b.pdf", "/tmp/c.pdf", "/tmp/a.pdf"]);
  });

  it("falls back to deterministic name sorting when dates are missing", () => {
    const sorted = sortZipEntriesForTest({
      outputPaths,
      inputNames,
      tool: "word.docx_to_pdf",
      options: { outputSortBy: "date", outputSortDirection: "asc" }
    });

    expect(sorted).toEqual(["/tmp/a.pdf", "/tmp/b.pdf", "/tmp/c.pdf"]);
  });
});

describe("createOutputZip", () => {
  let tmpDir = "";

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-archive-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes entries in sorted order and reindexes naming pattern", async () => {
    const outputA = path.join(tmpDir, "b.pdf");
    const outputB = path.join(tmpDir, "a.pdf");
    await fs.writeFile(outputA, "B");
    await fs.writeFile(outputB, "A");

    const zipPath = path.join(tmpDir, "result.zip");
    await createOutputZip({
      outputPaths: [outputA, outputB],
      inputNames: ["beta.docx", "alpha.docx"],
      sourceModifieds: [200, 100],
      tool: "word.docx_to_pdf",
      options: { outputSortBy: "date", outputSortDirection: "asc" },
      namingPattern: "{original}-{index}",
      destinationPath: zipPath
    });

    const buffer = await fs.readFile(zipPath);
    const archive = await JSZip.loadAsync(buffer);
    const fileNames = Object.keys(archive.files).filter((name) => !archive.files[name].dir).sort();

    expect(fileNames.length).toBe(2);
    expect(fileNames[0].endsWith("/alpha-1.pdf")).toBe(true);
    expect(fileNames[1].endsWith("/beta-2.pdf")).toBe(true);
  });
});
