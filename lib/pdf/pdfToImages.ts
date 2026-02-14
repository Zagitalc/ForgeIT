import fs from "node:fs/promises";
import path from "node:path";

import { AppError } from "@/lib/errors";
import { runCommand } from "@/lib/process";

export async function convertPdfToImages(inputPath: string, outputDir: string): Promise<string[]> {
  const prefix = path.join(outputDir, "page");

  try {
    const result = await runCommand("pdftoppm", ["-png", inputPath, prefix], 60_000);
    if (result.code !== 0) {
      throw new AppError(
        "PROCESSING_FAILED",
        "PDF to images failed.",
        result.stderr || result.stdout
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "PROCESSING_FAILED",
      "pdftoppm is required for PDF to image conversion.",
      "Install poppler-utils in your runtime."
    );
  }

  const entries = await fs.readdir(outputDir);
  const output = entries
    .filter((entry) => entry.startsWith("page-") && entry.endsWith(".png"))
    .map((entry) => path.join(outputDir, entry))
    .sort();

  if (output.length === 0) {
    throw new AppError("PROCESSING_FAILED", "PDF conversion did not produce any images.");
  }

  return output;
}
