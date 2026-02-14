import type { ErrorCode } from "@/lib/types/api";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: string;

  constructor(code: ErrorCode, message: string, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError("PROCESSING_FAILED", error.message);
  }

  return new AppError("PROCESSING_FAILED", "Unknown processing error.");
}
