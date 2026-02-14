import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(formData: FormData): { formData: () => Promise<FormData> } {
  return {
    formData: async () => formData
  };
}

describe("/api/jobs route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("GET returns jobs and queue stats", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      createJobMetadata: vi.fn(),
      deleteJobMetadata: vi.fn(),
      listJobMetadata: vi.fn(() => [{ id: "j1", tool: "pdf.merge", status: "completed" }])
    }));
    vi.doMock("@/lib/jobs/queue", () => ({
      jobQueue: {
        stats: vi.fn(() => ({ active: 1, queued: 2 })),
        enqueue: vi.fn()
      }
    }));

    const { GET } = await import("@/app/api/jobs/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.jobs.length).toBe(1);
    expect(payload.data.queue).toEqual({ active: 1, queued: 2 });
  });

  it("POST returns 429 when queue is full", async () => {
    class MockAppError extends Error {
      code: string;
      details?: string;
      constructor(code: string, message: string, details?: string) {
        super(message);
        this.code = code;
        this.details = details;
      }
    }

    vi.doMock("@/lib/errors", () => ({
      AppError: MockAppError,
      toAppError: (error: unknown) => {
        if (error instanceof MockAppError) return error;
        if (error instanceof Error) return new MockAppError("PROCESSING_FAILED", error.message);
        return new MockAppError("PROCESSING_FAILED", "Unknown processing error.");
      }
    }));
    vi.doMock("nanoid", () => ({ nanoid: vi.fn(() => "job-123") }));
    vi.doMock("@/lib/converters/libreofficeHealth", () => ({
      checkLibreOfficeHealth: vi.fn(async () => ({ available: true, path: "/usr/bin/soffice" }))
    }));
    vi.doMock("@/lib/storage/paths", () => ({
      ensureDirs: vi.fn(async () => undefined),
      uploadsDir: vi.fn(() => "/tmp/uploads/job-123")
    }));
    vi.doMock("@/lib/storage/files", () => ({
      persistUploadFile: vi.fn(async () => ({
        originalName: "f.md",
        mimeType: "text/markdown",
        storedPath: "/tmp/uploads/job-123/f.md",
        bytes: 4,
        lastModifiedMs: 10
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
        stats: vi.fn(() => ({ active: 2, queued: 25 })),
        enqueue: vi.fn(() => {
          throw new MockAppError("QUEUE_FULL", "Queue is full. Please retry shortly.");
        })
      }
    }));

    const { POST } = await import("@/app/api/jobs/route");
    const formData = new FormData();
    formData.set("tool", "convert.markdown_docx");
    formData.append("files", new File(["# hi"], "f.md", { type: "text/markdown", lastModified: 10 }));

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("QUEUE_FULL");
  });

  it("POST blocks word conversion when LibreOffice is unavailable", async () => {
    vi.doMock("nanoid", () => ({ nanoid: vi.fn(() => "job-123") }));
    vi.doMock("@/lib/converters/libreofficeHealth", () => ({
      checkLibreOfficeHealth: vi.fn(async () => ({ available: false, path: null }))
    }));
    vi.doMock("@/lib/storage/paths", () => ({
      ensureDirs: vi.fn(async () => undefined),
      uploadsDir: vi.fn(() => "/tmp/uploads/job-123")
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
    formData.set("tool", "word.docx_to_pdf");
    formData.append(
      "files",
      new File(["fake"], "doc.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        lastModified: 12
      })
    );

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("LIBREOFFICE_NOT_FOUND");
  });

  it("POST enqueues valid job and persists source modified map", async () => {
    const createJobMetadata = vi.fn();

    vi.doMock("nanoid", () => ({ nanoid: vi.fn(() => "job-abc") }));
    vi.doMock("@/lib/converters/libreofficeHealth", () => ({
      checkLibreOfficeHealth: vi.fn(async () => ({ available: true, path: "/usr/bin/soffice" }))
    }));
    vi.doMock("@/lib/storage/paths", () => ({
      ensureDirs: vi.fn(async () => undefined),
      uploadsDir: vi.fn(() => "/tmp/uploads/job-abc")
    }));
    vi.doMock("@/lib/storage/files", () => ({
      persistUploadFile: vi.fn(async () => ({
        originalName: "doc.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        storedPath: "/tmp/uploads/job-abc/doc.docx",
        bytes: 8,
        lastModifiedMs: 12345
      })),
      removePath: vi.fn(async () => undefined)
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      createJobMetadata,
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
    formData.set("tool", "word.docx_to_pdf");
    formData.set("options", JSON.stringify({ outputSortBy: "date", outputSortDirection: "desc" }));
    formData.append(
      "files",
      new File(["fake-doc"], "doc.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        lastModified: 12345
      })
    );

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.ok).toBe(true);
    expect(createJobMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-abc",
        sourceFileModifieds: { "doc.docx": 12345 }
      })
    );
  });

  it("POST returns validation error for malformed options JSON", async () => {
    vi.doMock("@/lib/converters/libreofficeHealth", () => ({
      checkLibreOfficeHealth: vi.fn(async () => ({ available: true, path: "/usr/bin/soffice" }))
    }));

    const { POST } = await import("@/app/api/jobs/route");
    const formData = new FormData();
    formData.set("tool", "word.docx_to_pdf");
    formData.set("options", "{broken-json");
    formData.append(
      "files",
      new File(["fake-doc"], "doc.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST returns validation error when tool is missing", async () => {
    const { POST } = await import("@/app/api/jobs/route");
    const formData = new FormData();
    formData.append("files", new File(["x"], "one.txt", { type: "text/plain" }));

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST accepts filename-date custom options payload", async () => {
    const createJobMetadata = vi.fn();

    vi.doMock("nanoid", () => ({ nanoid: vi.fn(() => "job-custom") }));
    vi.doMock("@/lib/converters/libreofficeHealth", () => ({
      checkLibreOfficeHealth: vi.fn(async () => ({ available: true, path: "/usr/bin/soffice" }))
    }));
    vi.doMock("@/lib/storage/paths", () => ({
      ensureDirs: vi.fn(async () => undefined),
      uploadsDir: vi.fn(() => "/tmp/uploads/job-custom")
    }));
    vi.doMock("@/lib/storage/files", () => ({
      persistUploadFile: vi.fn(async () => ({
        originalName: "dec_H80707-020725-094930-0000657546-1.pdf",
        mimeType: "application/pdf",
        storedPath: "/tmp/uploads/job-custom/file.pdf",
        bytes: 8,
        lastModifiedMs: 12345
      })),
      removePath: vi.fn(async () => undefined)
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      createJobMetadata,
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
        outputSortDirection: "asc",
        filenameDateMode: "custom",
        filenameDateRegex: "^[^-]+-(?<date>\\d{6})-(?<time>\\d{6})-",
        filenameDateDateFormat: "DDMMYY",
        filenameDateTimeFormat: "HHMMSS",
        filenameDateIgnoreCase: false
      })
    );
    formData.append("files", new File(["fake-pdf"], "one.pdf", { type: "application/pdf", lastModified: 12345 }));

    const response = await POST(makeRequest(formData) as never);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.ok).toBe(true);
    expect(createJobMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          outputSortBy: "filename_date",
          filenameDateMode: "custom"
        })
      })
    );
  });
});
