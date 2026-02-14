import { NextResponse } from "next/server";

import { AppError, toAppError } from "@/lib/errors";

export function ok<T>(jobId: string, data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, jobId, data }, { status });
}

export function fail(error: unknown, status = 400): NextResponse {
  const appError = error instanceof AppError ? error : toAppError(error);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details
      }
    },
    { status }
  );
}
