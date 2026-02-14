import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

import { AppError } from "@/lib/errors";
import { fail } from "@/lib/http";
import { getDownloadMeta } from "@/lib/jobs/download";
import { getJobMetadata } from "@/lib/jobs/metadata";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const job = getJobMetadata(id);

    if (!job) {
      throw new AppError("JOB_NOT_FOUND", `Job ${id} does not exist.`);
    }

    if (job.status !== "completed" || !job.outputPath) {
      throw new AppError("PROCESSING_FAILED", "Job output is not ready for download yet.");
    }

    const bytes = await fs.readFile(job.outputPath);
    const download = getDownloadMeta(job);

    if (!download.canDirectDownload && job.outputCount === 1 && job.outputPath.endsWith(".zip")) {
      const archive = await JSZip.loadAsync(bytes);
      const firstFile = Object.values(archive.files).find((entry) => !entry.dir);
      if (firstFile) {
        const innerBytes = await firstFile.async("nodebuffer");
        const innerName = path.basename(firstFile.name);
        const innerExt = path.extname(innerName).toLowerCase();
        const innerContentType =
          innerExt === ".pdf"
            ? "application/pdf"
            : innerExt === ".docx"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : innerExt === ".png"
                ? "image/png"
                : innerExt === ".jpg" || innerExt === ".jpeg"
                  ? "image/jpeg"
                  : innerExt === ".webp"
                    ? "image/webp"
                    : "application/octet-stream";

        return new NextResponse(new Uint8Array(innerBytes), {
          headers: {
            "Content-Type": innerContentType,
            "Content-Disposition": `attachment; filename=\"${innerName}\"`
          }
        });
      }
    }

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": download.contentType,
        "Content-Disposition": `attachment; filename=\"${download.fileName}\"`
      }
    });
  } catch (error) {
    return fail(error, 404);
  }
}
