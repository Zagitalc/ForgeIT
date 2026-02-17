import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(formData: FormData): { formData: () => Promise<FormData> } {
  return {
    formData: async () => formData
  };
}

describe("/api/jobs POST validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects custom filename-date mode when regex lacks named date group", async () => {
    vi.doMock("@/lib/storage/paths", () => ({
      ensureDirs: vi.fn(async () => undefined),
      uploadsDir: vi.fn(() => "/tmp/uploads/job-validation")
    }));
    vi.doMock("@/lib/storage/files", () => ({
      persistUploadFile: vi.fn(),
      removePath: vi.fn(async () => undefined)
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      createJobMetadata: vi.fn(),
      deleteJobMetadata: vi.fn(),
      listJobMetadata: vi.fn(() => [])
    }));
    vi.doMock("@/lib/jobs/queue", () => ({
      jobQueue: {
        stats: vi.fn(() => ({ active: 0, queued: 0 })),
        enqueue: vi.fn()
      }
    }));

    const { POST } = await import("@/app/api/jobs/route");
    const formData = new FormData();
    formData.set("tool", "pdf.merge");
    formData.set(
      "options",
      JSON.stringify({
        outputSortBy: "filename_date",
        filenameDateMode: "custom",
        filenameDateRegex: "^prefix-(\\d{6})$",
        filenameDateDateFormat: "DDMMYY",
        filenameDateTimeFormat: "HHMMSS"
      })
    );
    formData.append("files", new File(["fake-pdf"], "one.pdf", { type: "application/pdf", lastModified: 99 }));

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unsupported filenameDateDateFormat enum value", async () => {
    vi.doMock("@/lib/storage/paths", () => ({
      ensureDirs: vi.fn(async () => undefined),
      uploadsDir: vi.fn(() => "/tmp/uploads/job-validation")
    }));
    vi.doMock("@/lib/storage/files", () => ({
      persistUploadFile: vi.fn(),
      removePath: vi.fn(async () => undefined)
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      createJobMetadata: vi.fn(),
      deleteJobMetadata: vi.fn(),
      listJobMetadata: vi.fn(() => [])
    }));
    vi.doMock("@/lib/jobs/queue", () => ({
      jobQueue: {
        stats: vi.fn(() => ({ active: 0, queued: 0 })),
        enqueue: vi.fn()
      }
    }));

    const { POST } = await import("@/app/api/jobs/route");
    const formData = new FormData();
    formData.set("tool", "pdf.merge");
    formData.set(
      "options",
      JSON.stringify({
        outputSortBy: "filename_date",
        filenameDateMode: "custom",
        filenameDateRegex: "(?<date>\\d{6})",
        filenameDateDateFormat: "DDMMMYY",
        filenameDateTimeFormat: "none"
      })
    );
    formData.append("files", new File(["fake-pdf"], "one.pdf", { type: "application/pdf", lastModified: 99 }));

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts pdf.compress with safe mode", async () => {
    vi.doMock("@/lib/storage/paths", () => ({
      ensureDirs: vi.fn(async () => undefined),
      uploadsDir: vi.fn(() => "/tmp/uploads/job-validation")
    }));
    vi.doMock("@/lib/storage/files", () => ({
      persistUploadFile: vi.fn(async () => ({
        originalName: "one.pdf",
        mimeType: "application/pdf",
        storedPath: "/tmp/uploads/job-validation/one.pdf",
        bytes: 100,
        lastModifiedMs: 22
      })),
      removePath: vi.fn(async () => undefined)
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      createJobMetadata: vi.fn(),
      deleteJobMetadata: vi.fn(),
      listJobMetadata: vi.fn(() => [])
    }));
    vi.doMock("@/lib/jobs/queue", () => ({
      jobQueue: {
        stats: vi.fn(() => ({ active: 0, queued: 0 })),
        enqueue: vi.fn()
      }
    }));

    const { POST } = await import("@/app/api/jobs/route");
    const formData = new FormData();
    formData.set("tool", "pdf.compress");
    formData.set("options", JSON.stringify({ pdfCompressMode: "safe" }));
    formData.append("files", new File(["fake-pdf"], "one.pdf", { type: "application/pdf", lastModified: 22 }));

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.ok).toBe(true);
  });

  it("rejects pdf.compress with invalid mode", async () => {
    vi.doMock("@/lib/storage/paths", () => ({
      ensureDirs: vi.fn(async () => undefined),
      uploadsDir: vi.fn(() => "/tmp/uploads/job-validation")
    }));
    vi.doMock("@/lib/storage/files", () => ({
      persistUploadFile: vi.fn(),
      removePath: vi.fn(async () => undefined)
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      createJobMetadata: vi.fn(),
      deleteJobMetadata: vi.fn(),
      listJobMetadata: vi.fn(() => [])
    }));
    vi.doMock("@/lib/jobs/queue", () => ({
      jobQueue: {
        stats: vi.fn(() => ({ active: 0, queued: 0 })),
        enqueue: vi.fn()
      }
    }));

    const { POST } = await import("@/app/api/jobs/route");
    const formData = new FormData();
    formData.set("tool", "pdf.compress");
    formData.set("options", JSON.stringify({ pdfCompressMode: "balanced" }));
    formData.append("files", new File(["fake-pdf"], "one.pdf", { type: "application/pdf", lastModified: 99 }));

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });
});
