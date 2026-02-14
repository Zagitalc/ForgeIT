import fs from "node:fs/promises";
import path from "node:path";

import { AppError } from "@/lib/errors";
import { sanitizeFilename } from "@/lib/paths";
import type { JobFile } from "@/lib/types/jobs";

export async function persistUploadFile(dir: string, file: File): Promise<JobFile> {
  const parsed = path.parse(sanitizeFilename(file.name));
  let fileName = `${parsed.name}${parsed.ext}`;
  let destination = path.join(dir, fileName);
  let counter = 1;
  // Avoid collisions when users upload same-named files in one batch.
  while (await exists(destination)) {
    fileName = `${parsed.name}-${counter}${parsed.ext}`;
    destination = path.join(dir, fileName);
    counter += 1;
  }
  const data = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(destination, data);

  return {
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    storedPath: destination,
    bytes: data.byteLength
  };
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function removePath(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true });
}

export async function statSafe(targetPath: string): Promise<number> {
  try {
    const st = await fs.stat(targetPath);
    return st.size;
  } catch {
    throw new AppError("PROCESSING_FAILED", "Output file is missing.");
  }
}
