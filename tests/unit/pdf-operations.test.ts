import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

vi.mock("@/lib/process", () => ({
  runCommand: vi.fn()
}));

import { compressPdf, mergePdfs, splitPdf } from "@/lib/pdf/operations";
import { runCommand } from "@/lib/process";

async function createPdf(filePath: string, pages: number): Promise<void> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) {
    doc.addPage([300, 400]);
  }
  await fs.writeFile(filePath, await doc.save());
}

describe("pdf operations", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map(async (dir) => {
        await fs.rm(dir, { recursive: true, force: true });
      })
    );
    tempDirs.length = 0;
    vi.restoreAllMocks();
    vi.mocked(runCommand).mockReset();
  });

  it("uses qpdf for merge when available", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-pdf-ops-"));
    tempDirs.push(dir);

    const inputA = path.join(dir, "a.pdf");
    const inputB = path.join(dir, "b.pdf");
    const output = path.join(dir, "merged.pdf");
    await createPdf(inputA, 1);
    await createPdf(inputB, 2);

    const loadSpy = vi.spyOn(PDFDocument, "load");
    vi.mocked(runCommand).mockImplementation(async (_command, args) => {
      const target = args[args.length - 1];
      await fs.writeFile(target, "pdf");
      return { stdout: "", stderr: "", code: 0 };
    });

    await mergePdfs([inputA, inputB], output);

    expect(runCommand).toHaveBeenCalledWith(
      "qpdf",
      ["--empty", "--pages", inputA, inputB, "--", output],
      120000
    );
    expect(loadSpy).not.toHaveBeenCalled();
    await expect(fs.stat(output)).resolves.toBeDefined();
  });

  it("falls back to pdf-lib merge when qpdf is missing", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-pdf-ops-"));
    tempDirs.push(dir);

    const inputA = path.join(dir, "a.pdf");
    const inputB = path.join(dir, "b.pdf");
    const output = path.join(dir, "merged-fallback.pdf");
    await createPdf(inputA, 1);
    await createPdf(inputB, 1);

    const loadSpy = vi.spyOn(PDFDocument, "load");
    vi.mocked(runCommand).mockRejectedValueOnce(
      Object.assign(new Error("spawn qpdf ENOENT"), { code: "ENOENT" })
    );

    await mergePdfs([inputA, inputB], output);

    expect(loadSpy).toHaveBeenCalledWith(expect.any(Uint8Array));
    await expect(fs.stat(output)).resolves.toBeDefined();
  });

  it("loads split source with ignoreEncryption enabled", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-pdf-ops-"));
    tempDirs.push(dir);

    const input = path.join(dir, "source.pdf");
    await createPdf(input, 2);

    const loadSpy = vi.spyOn(PDFDocument, "load");

    const outputs = await splitPdf(input, "1-2", dir);

    expect(loadSpy).toHaveBeenCalledWith(expect.any(Uint8Array), expect.objectContaining({ ignoreEncryption: true }));
    expect(outputs).toHaveLength(2);
  });

  it("compressPdf calls qpdf with safe optimization flags", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-pdf-ops-"));
    tempDirs.push(dir);

    const input = path.join(dir, "source.pdf");
    const output = path.join(dir, "source-compressed.pdf");
    await createPdf(input, 1);

    vi.mocked(runCommand).mockImplementation(async (_command, args) => {
      await fs.writeFile(args[args.length - 1], "pdf");
      return { stdout: "", stderr: "", code: 0 };
    });

    await compressPdf(input, output, "safe");

    expect(runCommand).toHaveBeenCalledWith(
      "qpdf",
      [
        "--object-streams=generate",
        "--stream-data=compress",
        "--recompress-flate",
        "--optimize-images",
        input,
        output
      ],
      120000
    );
  });

  it("compressPdf throws actionable error when qpdf is missing", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-pdf-ops-"));
    tempDirs.push(dir);

    const input = path.join(dir, "source.pdf");
    const output = path.join(dir, "source-compressed.pdf");
    await createPdf(input, 1);

    vi.mocked(runCommand).mockRejectedValueOnce(Object.assign(new Error("spawn qpdf ENOENT"), { code: "ENOENT" }));

    await expect(compressPdf(input, output, "safe")).rejects.toThrow("qpdf is required for PDF compression.");
  });

  it("compressPdf throws processing error when qpdf returns non-zero code", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-pdf-ops-"));
    tempDirs.push(dir);

    const input = path.join(dir, "source.pdf");
    const output = path.join(dir, "source-compressed.pdf");
    await createPdf(input, 1);

    vi.mocked(runCommand).mockResolvedValueOnce({ stdout: "", stderr: "qpdf failed", code: 2 });

    await expect(compressPdf(input, output, "safe")).rejects.toThrow("PDF compression failed.");
  });
});
