import { access } from "node:fs/promises";

import { getLibreOfficeCandidates } from "@/lib/config/libreoffice";
import { runCommand } from "@/lib/process";

let cachedPath: string | null = null;
let lastChecked = 0;
const CACHE_TTL_MS = 30_000;

export async function resolveLibreOfficePath(): Promise<string | null> {
  const now = Date.now();
  if (cachedPath && now - lastChecked < CACHE_TTL_MS) {
    return cachedPath;
  }

  for (const candidate of getLibreOfficeCandidates()) {
    try {
      if (candidate.includes("/") || candidate.includes("\\")) {
        await access(candidate);
      }
      const result = await runCommand(candidate, ["--version"], 8_000);
      if (result.code === 0) {
        cachedPath = candidate;
        lastChecked = now;
        return candidate;
      }
    } catch {
      // try next path
    }
  }

  cachedPath = null;
  lastChecked = now;
  return null;
}

export async function checkLibreOfficeHealth(): Promise<{ available: boolean; path: string | null }> {
  const path = await resolveLibreOfficePath();
  return {
    available: Boolean(path),
    path
  };
}
