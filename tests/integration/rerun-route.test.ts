import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JobRecord } from "@/lib/types/api";

const baseJob: JobRecord = {
  id: "job-1",
  tool: "word.docx_to_pdf",
  status: "completed",
  inputCount: 1,
  outputCount: 1,
  totalBytes: 10,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  errorCode: null,
  errorMessage: null,
  outputPath: "/tmp/out.pdf",
  expiresAt: null,
  sourceFilesAvailable: false
};

describe("POST /api/jobs/[id]/rerun", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 409 when source files are unavailable", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({ ...baseJob, sourceFilesAvailable: false }))
    }));

    const { POST } = await import("@/app/api/jobs/[id]/rerun/route");
    const response = await POST({} as never, { params: Promise.resolve({ id: "job-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
  });

  it("returns ok when source files are still available", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({ ...baseJob, sourceFilesAvailable: true }))
    }));

    const { POST } = await import("@/app/api/jobs/[id]/rerun/route");
    const response = await POST({} as never, { params: Promise.resolve({ id: "job-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
  });

  it("returns 404 when job is missing", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => null)
    }));

    const { POST } = await import("@/app/api/jobs/[id]/rerun/route");
    const response = await POST({} as never, { params: Promise.resolve({ id: "missing" }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("JOB_NOT_FOUND");
  });
});
