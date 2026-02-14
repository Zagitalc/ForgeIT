import { z } from "zod";

import { LIMITS } from "@/lib/config/limits";
import { AppError } from "@/lib/errors";
import { TOOL_TYPES } from "@/lib/types/api";

export const createJobSchema = z.object({
  tool: z.enum(TOOL_TYPES),
  options: z
    .object({
      namingPattern: z.string().max(120).optional(),
      outputSortBy: z.union([z.literal("name"), z.literal("date")]).optional(),
      outputSortDirection: z.union([z.literal("asc"), z.literal("desc")]).optional(),
      splitPages: z.string().max(120).optional(),
      rotateDegrees: z.union([z.literal(90), z.literal(180), z.literal(270)]).optional(),
      imageFormat: z.union([z.literal("jpeg"), z.literal("png"), z.literal("webp")]).optional(),
      imageQuality: z.number().min(1).max(100).optional(),
      imageWidth: z.number().min(1).max(10_000).optional(),
      imageHeight: z.number().min(1).max(10_000).optional(),
      pageNumberStart: z.number().min(1).max(5000).optional()
    })
    .optional()
});

export function enforceFileLimits(files: File[]): void {
  if (files.length === 0) {
    throw new AppError("VALIDATION_ERROR", "At least one file is required.");
  }

  if (files.length > LIMITS.maxFilesPerJob) {
    throw new AppError(
      "LIMIT_EXCEEDED",
      `Too many files. Maximum is ${LIMITS.maxFilesPerJob} files per job.`
    );
  }

  let totalBytes = 0;
  for (const file of files) {
    if (file.size > LIMITS.maxFileBytes) {
      throw new AppError(
        "LIMIT_EXCEEDED",
        `File ${file.name} exceeds maximum size of ${Math.round(LIMITS.maxFileBytes / (1024 * 1024))}MB.`
      );
    }
    totalBytes += file.size;
  }

  if (totalBytes > LIMITS.maxTotalBytes) {
    throw new AppError(
      "LIMIT_EXCEEDED",
      `Total upload size exceeds ${Math.round(LIMITS.maxTotalBytes / (1024 * 1024))}MB.`
    );
  }
}

export function assertExtension(fileName: string, allowed: string[]): void {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || !allowed.includes(extension)) {
    throw new AppError(
      "UNSUPPORTED_FORMAT",
      `Unsupported file type for ${fileName}. Allowed: ${allowed.join(", ")}.`
    );
  }
}
