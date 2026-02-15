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

  it("sorts by filename date with parsed entries first and unknown entries last", () => {
    const sorted = sortZipEntriesForTest({
      outputPaths: ["/tmp/one.pdf", "/tmp/two.pdf", "/tmp/three.pdf"],
      inputNames: [
        "dec_H80707-020725-094930-0000657546-1.pdf",
        "plain-file.pdf",
        "dec_H80707-311224-235959-0000000001-1.pdf"
      ],
      tool: "pdf.merge",
      options: { outputSortBy: "filename_date", outputSortDirection: "asc", filenameDateMode: "smart" }
    });

    expect(sorted).toEqual(["/tmp/three.pdf", "/tmp/one.pdf", "/tmp/two.pdf"]);
  });

  it("sorts text-month statement filenames chronologically and keeps unparsed entries last", () => {
    const sorted = sortZipEntriesForTest({
      outputPaths: ["/tmp/a.pdf", "/tmp/b.pdf", "/tmp/c.pdf", "/tmp/d.pdf"],
      inputNames: [
        "Statement 02-FEB-26 AC 30967726.pdf",
        "notes.pdf",
        "Statement 01-SEP-25 AC 30967726.pdf",
        "Statement 08-DEC-21 AC 30967726.pdf"
      ],
      tool: "pdf.merge",
      options: { outputSortBy: "filename_date", outputSortDirection: "asc", filenameDateMode: "smart" }
    });

    expect(sorted).toEqual(["/tmp/d.pdf", "/tmp/c.pdf", "/tmp/a.pdf", "/tmp/b.pdf"]);
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

  it("renders {filedate:*} token from extracted filename date", async () => {
    const outputA = path.join(tmpDir, "a.pdf");
    const outputB = path.join(tmpDir, "b.pdf");
    await fs.writeFile(outputA, "A");
    await fs.writeFile(outputB, "B");

    const zipPath = path.join(tmpDir, "result-filedate.zip");
    await createOutputZip({
      outputPaths: [outputA, outputB],
      inputNames: [
        "dec_H80707-020725-094930-0000657546-1.pdf",
        "dec_H80707-311224-235959-0000000001-1.pdf"
      ],
      sourceModifieds: [0, 0],
      tool: "pdf.merge",
      options: { outputSortBy: "filename_date", outputSortDirection: "asc", filenameDateMode: "smart" },
      namingPattern: "{filedate:YYYY-MM-DD}-{index}",
      destinationPath: zipPath
    });

    const buffer = await fs.readFile(zipPath);
    const archive = await JSZip.loadAsync(buffer);
    const fileNames = Object.keys(archive.files).filter((name) => !archive.files[name].dir).sort();

    expect(fileNames[0]).toContain("2024-12-31-1.pdf");
    expect(fileNames[1]).toContain("2025-07-02-2.pdf");
  });

  it("renders {filedate:*} token from statement DD-MMM-YY filenames", async () => {
    const outputA = path.join(tmpDir, "a.pdf");
    const outputB = path.join(tmpDir, "b.pdf");
    await fs.writeFile(outputA, "A");
    await fs.writeFile(outputB, "B");

    const zipPath = path.join(tmpDir, "result-statement-filedate.zip");
    await createOutputZip({
      outputPaths: [outputA, outputB],
      inputNames: ["Statement 02-DEC-24 AC 30967726.pdf", "Statement 01-SEP-25 AC 30967726.pdf"],
      sourceModifieds: [0, 0],
      tool: "pdf.merge",
      options: { outputSortBy: "filename_date", outputSortDirection: "asc", filenameDateMode: "smart" },
      namingPattern: "{filedate:YYYY-MM-DD}-{index}",
      destinationPath: zipPath
    });

    const buffer = await fs.readFile(zipPath);
    const archive = await JSZip.loadAsync(buffer);
    const fileNames = Object.keys(archive.files).filter((name) => !archive.files[name].dir).sort();

    expect(fileNames[0]).toContain("2024-12-02-1.pdf");
    expect(fileNames[1]).toContain("2025-09-01-2.pdf");
  });
});
