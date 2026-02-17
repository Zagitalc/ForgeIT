import { beforeEach, describe, expect, it, vi } from "vitest";

describe("/api/jobs/[id]/download route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 404 when job is missing", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({ getJobMetadata: vi.fn(() => null) }));

    const { GET } = await import("@/app/api/jobs/[id]/download/route");
    const response = await GET({} as never, { params: Promise.resolve({ id: "x" }) });

    expect(response.status).toBe(404);
  });

  it("returns direct file response", async () => {
    vi.doMock("node:fs/promises", () => ({
      default: {
        readFile: vi.fn(async () => Buffer.from("pdf-bytes"))
      }
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({
        id: "j1",
        status: "completed",
        outputPath: "/tmp/out.pdf",
        outputCount: 1
      }))
    }));
    vi.doMock("@/lib/jobs/download", () => ({
      getDownloadMeta: vi.fn(() => ({
        canDirectDownload: true,
        contentType: "application/pdf",
        fileName: "out.pdf"
      }))
    }));

    const { GET } = await import("@/app/api/jobs/[id]/download/route");
    const response = await GET({} as never, { params: Promise.resolve({ id: "j1" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("out.pdf");
  });

  it("returns direct PDF for completed pdf.compress single output", async () => {
    vi.doMock("node:fs/promises", () => ({
      default: {
        readFile: vi.fn(async () => Buffer.from("compressed-pdf"))
      }
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({
        id: "j-compress",
        tool: "pdf.compress",
        status: "completed",
        outputPath: "/tmp/out-compressed.pdf",
        outputCount: 1,
        canDirectDownload: true
      }))
    }));
    vi.doMock("@/lib/jobs/download", () => ({
      getDownloadMeta: vi.fn(() => ({
        canDirectDownload: true,
        contentType: "application/pdf",
        fileName: "out-compressed.pdf"
      }))
    }));

    const { GET } = await import("@/app/api/jobs/[id]/download/route");
    const response = await GET({} as never, { params: Promise.resolve({ id: "j-compress" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("out-compressed.pdf");
  });

  it("returns 404 processing error when job output is not ready", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({
        id: "j-processing",
        status: "processing",
        outputPath: null,
        outputCount: 0
      }))
    }));

    const { GET } = await import("@/app/api/jobs/[id]/download/route");
    const response = await GET({} as never, { params: Promise.resolve({ id: "j-processing" }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("PROCESSING_FAILED");
  });

  it("extracts single file from legacy zip output", async () => {
    vi.doMock("node:fs/promises", () => ({
      default: {
        readFile: vi.fn(async () => Buffer.from("zip-bytes"))
      }
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({
        id: "j2",
        status: "completed",
        outputPath: "/tmp/result.zip",
        outputCount: 1
      }))
    }));
    vi.doMock("@/lib/jobs/download", () => ({
      getDownloadMeta: vi.fn(() => ({
        canDirectDownload: false,
        contentType: "application/zip",
        fileName: "result.zip"
      }))
    }));
    vi.doMock("jszip", () => ({
      default: {
        loadAsync: vi.fn(async () => ({
          files: {
            "doc.pdf": {
              dir: false,
              name: "doc.pdf",
              async: vi.fn(async () => Buffer.from("pdf"))
            }
          }
        }))
      }
    }));

    const { GET } = await import("@/app/api/jobs/[id]/download/route");
    const response = await GET({} as never, { params: Promise.resolve({ id: "j2" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("doc.pdf");
  });

  it("falls back to zip response when legacy zip has no file entries", async () => {
    vi.doMock("node:fs/promises", () => ({
      default: {
        readFile: vi.fn(async () => Buffer.from("zip-bytes"))
      }
    }));
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({
        id: "j3",
        status: "completed",
        outputPath: "/tmp/result.zip",
        outputCount: 1
      }))
    }));
    vi.doMock("@/lib/jobs/download", () => ({
      getDownloadMeta: vi.fn(() => ({
        canDirectDownload: false,
        contentType: "application/zip",
        fileName: "result.zip"
      }))
    }));
    vi.doMock("jszip", () => ({
      default: {
        loadAsync: vi.fn(async () => ({ files: {} }))
      }
    }));

    const { GET } = await import("@/app/api/jobs/[id]/download/route");
    const response = await GET({} as never, { params: Promise.resolve({ id: "j3" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("result.zip");
  });
});
