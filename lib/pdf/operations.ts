import fs from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

import { AppError } from "@/lib/errors";
import { parsePageRanges } from "@/lib/pdf/utils";
import { runCommand } from "@/lib/process";

const PDF_TOOL_TIMEOUT_MS = 120_000;

function isBinaryMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: string; message?: string };
  if (maybeError.code === "ENOENT") {
    return true;
  }

  return typeof maybeError.message === "string" && maybeError.message.includes("ENOENT");
}

async function mergePdfsWithQpdf(inputPaths: string[], outputPath: string): Promise<void> {
  const args = ["--empty", "--pages", ...inputPaths, "--", outputPath];
  const result = await runCommand("qpdf", args, PDF_TOOL_TIMEOUT_MS);
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `qpdf exited with code ${result.code}`);
  }

  await fs.access(outputPath);
}

async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

async function mergePdfsWithPdfLib(inputPaths: string[], outputPath: string): Promise<void> {
  const output = await PDFDocument.create();

  for (const inputPath of inputPaths) {
    const bytes = await fs.readFile(inputPath);
    const doc = await PDFDocument.load(bytes);
    const pages = await output.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }

  const bytes = await output.save();
  await fs.writeFile(outputPath, bytes);
}

export async function mergePdfs(inputPaths: string[], outputPath: string): Promise<void> {
  try {
    await mergePdfsWithQpdf(inputPaths, outputPath);
    return;
  } catch (error) {
    if (!isBinaryMissing(error)) {
      const reason = error instanceof Error ? error.message : "Unknown qpdf failure.";
      throw new AppError("PROCESSING_FAILED", "Cannot merge PDFs with qpdf.", reason);
    }
  }

  try {
    await mergePdfsWithPdfLib(inputPaths, outputPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown PDF parse failure.";
    throw new AppError(
      "PROCESSING_FAILED",
      "Cannot merge PDFs with built-in engine. Install qpdf for protected bank-statement PDFs.",
      reason
    );
  }
}

export async function splitPdf(inputPath: string, pagesSpec: string, outputDir: string): Promise<string[]> {
  const bytes = await fs.readFile(inputPath);
  const source = await loadPdf(bytes);
  const pageIndices = parsePageRanges(pagesSpec, source.getPageCount());

  const outputPaths: string[] = [];
  for (const index of pageIndices) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(source, [index]);
    doc.addPage(page);
    const outputPath = path.join(outputDir, `page-${index + 1}.pdf`);
    await fs.writeFile(outputPath, await doc.save());
    outputPaths.push(outputPath);
  }

  return outputPaths;
}

export async function rotatePdf(inputPath: string, outputPath: string, angle: 90 | 180 | 270): Promise<void> {
  const bytes = await fs.readFile(inputPath);
  const doc = await loadPdf(bytes);
  doc.getPages().forEach((page) => {
    page.setRotation(degrees(angle));
  });
  await fs.writeFile(outputPath, await doc.save());
}

export async function addPageNumbers(inputPath: string, outputPath: string, start = 1): Promise<void> {
  const bytes = await fs.readFile(inputPath);
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  doc.getPages().forEach((page, index) => {
    const { width } = page.getSize();
    page.drawText(String(start + index), {
      x: width - 40,
      y: 20,
      font,
      size: 10,
      color: rgb(0.32, 0.32, 0.32)
    });
  });

  await fs.writeFile(outputPath, await doc.save());
}

export async function imagesToPdf(inputPaths: string[], outputPath: string): Promise<void> {
  const doc = await PDFDocument.create();

  for (const filePath of inputPaths) {
    const bytes = await fs.readFile(filePath);
    const lower = filePath.toLowerCase();
    const image = lower.endsWith(".png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    });
  }

  await fs.writeFile(outputPath, await doc.save());
}
