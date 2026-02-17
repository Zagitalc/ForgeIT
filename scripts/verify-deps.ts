import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

import { getChromiumCandidates } from "../lib/config/chromium";
import { getLibreOfficeCandidates } from "../lib/config/libreoffice";
import { getQpdfCandidates } from "../lib/config/qpdf";

function runVersion(command: string, args: string[]): Promise<string> {
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

async function resolveBinary(candidates: string[], args: string[]): Promise<{ path: string; version: string } | null> {
  for (const candidate of candidates) {
    try {
      if (candidate.includes("/") || candidate.includes("\\")) {
        await access(candidate);
      }
      const version = await runVersion(candidate, args);
      return { path: candidate, version };
    } catch {
      // keep trying
    }
  }

  return null;
}

async function main(): Promise<void> {
  const libreOffice = await resolveBinary(getLibreOfficeCandidates(), ["--version"]);
  const chromium = await resolveBinary(getChromiumCandidates(), ["--version"]);
  const qpdf = await resolveBinary(getQpdfCandidates(), ["--version"]);

  if (!libreOffice) {
    console.error("[FAIL] LibreOffice not found. Install LibreOffice or set LIBREOFFICE_PATH.");
    process.exitCode = 1;
  } else {
    console.log(`[OK] LibreOffice: ${libreOffice.path} (${libreOffice.version})`);
  }

  if (!chromium) {
    console.error("[FAIL] Chromium not found. Install Chromium or set CHROMIUM_PATH.");
    process.exitCode = 1;
  } else {
    console.log(`[OK] Chromium: ${chromium.path} (${chromium.version})`);
  }

  if (!qpdf) {
    console.error("[FAIL] qpdf not found. Install qpdf or set QPDF_PATH.");
    process.exitCode = 1;
  } else {
    console.log(`[OK] qpdf: ${qpdf.path} (${qpdf.version})`);
  }

  if (process.exitCode === 1) {
    console.error("One or more dependencies are missing.");
  } else {
    console.log("All required native dependencies are available.");
  }
}

void main();
