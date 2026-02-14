import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

import { LIMITS } from "@/lib/config/limits";
import { checkLibreOfficeHealth } from "@/lib/converters/libreofficeHealth";
import { AppError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { createJobMetadata, deleteJobMetadata, listJobMetadata } from "@/lib/jobs/metadata";
import { jobQueue } from "@/lib/jobs/queue";
import { persistUploadFile, removePath } from "@/lib/storage/files";
import { ensureDirs, uploadsDir } from "@/lib/storage/paths";
import type { JobOptions, ToolType } from "@/lib/types/api";
import type { EnqueuedJob } from "@/lib/types/jobs";
import { createJobSchema, enforceFileLimits } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    data: {
      jobs: listJobMetadata(100),
      queue: jobQueue.stats(),
      limits: LIMITS
    }
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    enforceFileLimits(files);

    const rawTool = formData.get("tool");
    const rawOptions = formData.get("options");
    if (typeof rawTool !== "string") {
      throw new AppError("VALIDATION_ERROR", "Missing tool value.");
    }

    let options: JobOptions = {};
    if (typeof rawOptions === "string" && rawOptions.trim().length > 0) {
      try {
        options = JSON.parse(rawOptions) as JobOptions;
      } catch {
        throw new AppError("VALIDATION_ERROR", "options must be valid JSON.");
      }
    }

    const parsed = createJobSchema.safeParse({ tool: rawTool, options });
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid tool or options.", parsed.error.message);
    }

    const tool = parsed.data.tool as ToolType;

    if (tool === "word.docx_to_pdf") {
      const libreOffice = await checkLibreOfficeHealth();
      if (!libreOffice.available) {
        throw new AppError(
          "LIBREOFFICE_NOT_FOUND",
          "LibreOffice is unavailable. Install LibreOffice or configure LIBREOFFICE_PATH."
        );
      }
    }

    const id = nanoid();
    await ensureDirs(id);

    const persistedFiles = [];
    for (const file of files) {
      persistedFiles.push(await persistUploadFile(uploadsDir(id), file));
    }

    const totalBytes = persistedFiles.reduce((sum, file) => sum + file.bytes, 0);

    createJobMetadata({
      id,
      tool,
      inputCount: persistedFiles.length,
      totalBytes,
      options: parsed.data.options ?? {},
      sourceFileNames: persistedFiles.map((file) => file.originalName)
    });

    const queuedJob: EnqueuedJob = {
      id,
      tool,
      files: persistedFiles,
      options: parsed.data.options ?? {}
    };

    try {
      jobQueue.enqueue(queuedJob);
    } catch (error) {
      deleteJobMetadata(id);
      await removePath(uploadsDir(id));
      throw error;
    }

    return ok(
      id,
      {
        status: "queued",
        queue: jobQueue.stats()
      },
      202
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "QUEUE_FULL") {
      return fail(error, 429);
    }

    return fail(error, 400);
  }
}
