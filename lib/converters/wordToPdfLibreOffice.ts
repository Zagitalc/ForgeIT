import fs from "node:fs/promises";
import path from "node:path";

import { LIMITS } from "@/lib/config/limits";
import { AppError } from "@/lib/errors";
import { runCommand } from "@/lib/process";
import { outputsDir, libreOfficeProfileDir } from "@/lib/storage/paths";
import { resolveLibreOfficePath } from "@/lib/converters/libreofficeHealth";

let lock: Promise<void> = Promise.resolve();

async function acquireLock(): Promise<() => void> {
  let release!: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  const previous = lock;
  lock = previous.then(() => nextLock);
  await previous;

  return release;
}

export async function convertWordDocxToPdf(inputPath: string, jobId: string): Promise<string> {
  const soffice = await resolveLibreOfficePath();
  if (!soffice) {
    throw new AppError(
      "LIBREOFFICE_NOT_FOUND",
      "LibreOffice not found. Install LibreOffice and set LIBREOFFICE_PATH if needed."
    );
  }

  const outputDirectory = outputsDir(jobId);
  await fs.mkdir(outputDirectory, { recursive: true });
  const loProfile = libreOfficeProfileDir(jobId);
  await fs.mkdir(loProfile, { recursive: true });

  const outputFileName = `${path.parse(inputPath).name}.pdf`;
  const outputPath = path.join(outputDirectory, outputFileName);

  const release = await acquireLock();

  try {
    const args = [
      `-env:UserInstallation=file://${loProfile}`,
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outputDirectory,
      inputPath
    ];

    const attempts = 2;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await runCommand(soffice, args, LIMITS.libreOfficeTimeoutMs);
        if (result.code !== 0) {
          throw new AppError(
            "LIBREOFFICE_CONVERSION_FAILED",
            "LibreOffice conversion failed.",
            result.stderr || result.stdout
          );
        }

        await fs.access(outputPath);
        return outputPath;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : "Unknown";
        const transient = /lock|profile|already running|PIPE/i.test(message);

        if (!transient || attempt === attempts) {
          break;
        }
      }
    }

    if (lastError instanceof Error && lastError.message.includes("PROCESS_TIMEOUT")) {
      throw new AppError(
        "LIBREOFFICE_TIMEOUT",
        "Word to PDF conversion timed out.",
        "Try a smaller document or increase LIBREOFFICE_TIMEOUT_MS."
      );
    }

    if (lastError instanceof AppError) {
      throw lastError;
    }

    throw new AppError(
      "LIBREOFFICE_CONVERSION_FAILED",
      "Word to PDF conversion failed.",
      lastError instanceof Error ? lastError.message : undefined
    );
  } finally {
    release();
  }
}
