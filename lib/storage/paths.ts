import fs from "node:fs/promises";
import path from "node:path";

export const ROOT_TEMP_DIR = process.env.FORGEIT_TEMP_ROOT ?? "/tmp/forgeit";

export function uploadsDir(jobId: string): string {
  return path.join(ROOT_TEMP_DIR, "uploads", jobId);
}

export function processingDir(jobId: string): string {
  return path.join(ROOT_TEMP_DIR, "processing", jobId);
}

export function outputsDir(jobId: string): string {
  return path.join(ROOT_TEMP_DIR, "outputs", jobId);
}

export function libreOfficeProfileDir(jobId: string): string {
  return path.join(ROOT_TEMP_DIR, "lo-profile", jobId);
}

export async function ensureDirs(jobId: string): Promise<void> {
  await fs.mkdir(uploadsDir(jobId), { recursive: true });
  await fs.mkdir(processingDir(jobId), { recursive: true });
  await fs.mkdir(outputsDir(jobId), { recursive: true });
  await fs.mkdir(libreOfficeProfileDir(jobId), { recursive: true });
}
