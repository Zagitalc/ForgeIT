import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { fail } from "@/lib/http";
import { clearOutputPath, getJobMetadata } from "@/lib/jobs/metadata";
import { removePath } from "@/lib/storage/files";

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
    const fileName = `${path.basename(job.outputPath)}`;

    await removePath(job.outputPath);
    clearOutputPath(job.id);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`
      }
    });
  } catch (error) {
    return fail(error, 404);
  }
}
