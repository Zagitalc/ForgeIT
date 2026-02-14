import fs from "node:fs/promises";
import path from "node:path";

import { LIMITS } from "@/lib/config/limits";
import { listJobsForCleanup, markJobCleaned } from "@/lib/jobs/metadata";
import { removePath } from "@/lib/storage/files";
import {
  ROOT_TEMP_DIR,
  libreOfficeProfileDir,
  outputsDir,
  processingDir,
  uploadsDir
} from "@/lib/storage/paths";

let started = false;

export async function startupSweep(): Promise<void> {
  const cutoff = Date.now() - LIMITS.staleCleanupMs;
  await sweepDirectory(ROOT_TEMP_DIR, cutoff);
}

async function sweepDirectory(base: string, cutoffMs: number): Promise<void> {
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    for (const entry of entries) {
      const target = path.join(base, entry.name);
      const stat = await fs.stat(target);
      if (stat.mtimeMs <= cutoffMs) {
        await removePath(target);
      } else if (entry.isDirectory()) {
        await sweepDirectory(target, cutoffMs);
      }
    }
  } catch {
    // best effort cleanup
  }
}

async function runCleanupTick(): Promise<void> {
  const nowIso = new Date().toISOString();
  const jobs = listJobsForCleanup(nowIso);
  for (const job of jobs) {
    await removePath(uploadsDir(job.id));
    await removePath(processingDir(job.id));
    await removePath(outputsDir(job.id));
    await removePath(libreOfficeProfileDir(job.id));
    markJobCleaned(job.id);
  }
}

export async function scheduleCleanup(): Promise<void> {
  if (started) {
    return;
  }
  started = true;
  await startupSweep();
  setInterval(() => {
    runCleanupTick().catch(() => {
      // no-op
    });
  }, LIMITS.cleanupIntervalMs).unref();
}
