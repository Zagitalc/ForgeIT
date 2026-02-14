import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { fail } from "@/lib/http";
import { getJobMetadata } from "@/lib/jobs/metadata";

export const runtime = "nodejs";

export async function POST(
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
      data: {
        tool: job.tool,
        options: job.options ?? {},
        sourceFileNames: job.sourceFileNames ?? [],
        message: "Files are not persisted. Attach files and start a new job."
      }
    });
  } catch (error) {
    return fail(error, 404);
  }
}
