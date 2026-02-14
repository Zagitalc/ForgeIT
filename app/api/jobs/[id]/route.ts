import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { fail } from "@/lib/http";
import { deleteJobMetadata, getJobMetadata } from "@/lib/jobs/metadata";
import { removePath } from "@/lib/storage/files";
import { libreOfficeProfileDir, outputsDir, processingDir, uploadsDir } from "@/lib/storage/paths";

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

    return NextResponse.json({
      ok: true,
      data: job
    });
  } catch (error) {
    return fail(error, 404);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const job = getJobMetadata(id);
    if (!job) {
      throw new AppError("JOB_NOT_FOUND", `Job ${id} does not exist.`);
    }

    await removePath(uploadsDir(id));
    await removePath(processingDir(id));
    await removePath(outputsDir(id));
    await removePath(libreOfficeProfileDir(id));
    deleteJobMetadata(id);

    return NextResponse.json({
      ok: true,
      data: { deleted: true, id }
    });
  } catch (error) {
    return fail(error, 404);
  }
}
