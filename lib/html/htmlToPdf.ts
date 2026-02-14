import fs from "node:fs/promises";

import { chromium } from "playwright-core";

import { getChromiumCandidates } from "@/lib/config/chromium";
import { AppError } from "@/lib/errors";

async function resolveChromiumExecutable(): Promise<string | undefined> {
  for (const candidate of getChromiumCandidates()) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }

  return undefined;
}

export async function convertHtmlToPdf(html: string, outputPath: string): Promise<void> {
  const executablePath = await resolveChromiumExecutable();
  if (!executablePath) {
    throw new AppError(
      "PROCESSING_FAILED",
      "Chromium was not found for HTML to PDF conversion.",
      "Install Chromium or set CHROMIUM_PATH."
    );
  }

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: outputPath,
      printBackground: true,
      format: "A4"
    });
  } finally {
    await browser.close();
  }
}
