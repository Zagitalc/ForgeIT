import { beforeEach, describe, expect, it, vi } from "vitest";

describe("/api/jobs/[id] routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("GET returns 404 when job is missing", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => null),
      deleteJobMetadata: vi.fn()
    }));

    const { GET } = await import("@/app/api/jobs/[id]/route");
    const response = await GET({} as never, { params: Promise.resolve({ id: "x" }) });
    expect(response.status).toBe(404);
  });

  it("GET returns metadata for known job", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({ id: "j-known", status: "queued" })),
      deleteJobMetadata: vi.fn()
    }));

    const { GET } = await import("@/app/api/jobs/[id]/route");
    const response = await GET({} as never, { params: Promise.resolve({ id: "j-known" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.id).toBe("j-known");
  });

  it("DELETE removes temp paths and metadata", async () => {
    const removePath = vi.fn(async () => undefined);
    const deleteJobMetadata = vi.fn();

    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({ id: "j1" })),
      deleteJobMetadata
    }));
    vi.doMock("@/lib/storage/files", () => ({ removePath }));
    vi.doMock("@/lib/storage/paths", () => ({
      uploadsDir: vi.fn((id: string) => `/tmp/uploads/${id}`),
      processingDir: vi.fn((id: string) => `/tmp/processing/${id}`),
      outputsDir: vi.fn((id: string) => `/tmp/outputs/${id}`),
      libreOfficeProfileDir: vi.fn((id: string) => `/tmp/lo/${id}`)
    }));

    const { DELETE } = await import("@/app/api/jobs/[id]/route");
    const response = await DELETE({} as never, { params: Promise.resolve({ id: "j1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(removePath).toHaveBeenCalledTimes(4);
    expect(deleteJobMetadata).toHaveBeenCalledWith("j1");
  });

  it("DELETE returns 404 when job is missing", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => null),
      deleteJobMetadata: vi.fn()
    }));

    const { DELETE } = await import("@/app/api/jobs/[id]/route");
    const response = await DELETE({} as never, { params: Promise.resolve({ id: "missing" }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("JOB_NOT_FOUND");
  });
});
