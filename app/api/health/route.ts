import { NextResponse } from "next/server";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

import { getQpdfCandidates } from "@/lib/config/qpdf";
import { checkLibreOfficeHealth } from "@/lib/converters/libreofficeHealth";
import { jobQueue } from "@/lib/jobs/queue";

export const runtime = "nodejs";

async function runVersion(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let output = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      output += data.toString();
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(output.trim()));
      }
    });
  });
}

async function resolveBinary(candidates: string[]): Promise<{ available: boolean; path: string | null; version?: string }> {
  for (const candidate of candidates) {
    try {
      if (candidate.includes("/") || candidate.includes("\\")) {
        await access(candidate);
      }
      const version = await runVersion(candidate, ["--version"]);
      return { available: true, path: candidate, version };
    } catch {
      // try next candidate
    }
  }

  return { available: false, path: null };
}

export async function GET(): Promise<NextResponse> {
  const libreOffice = await checkLibreOfficeHealth();
  const qpdf = await resolveBinary(getQpdfCandidates());

  return NextResponse.json({
    ok: true,
    data: {
      libreOffice,
      qpdf,
      queue: jobQueue.stats(),
      offline: true
    }
  });
}
