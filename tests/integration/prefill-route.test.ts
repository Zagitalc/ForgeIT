import { beforeEach, describe, expect, it, vi } from "vitest";

describe("/api/jobs/[id]/prefill route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns settings payload for known job", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => ({
        id: "j1",
        tool: "word.docx_to_pdf",
        options: { outputSortBy: "date", outputSortDirection: "desc" },
        sourceFileNames: ["a.docx"]
      }))
    }));

    const { POST } = await import("@/app/api/jobs/[id]/prefill/route");
    const response = await POST({} as never, { params: Promise.resolve({ id: "j1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.tool).toBe("word.docx_to_pdf");
    expect(payload.data.options.outputSortBy).toBe("date");
  });

  it("returns 404 when job is missing", async () => {
    vi.doMock("@/lib/jobs/metadata", () => ({
      getJobMetadata: vi.fn(() => null)
    }));

    const { POST } = await import("@/app/api/jobs/[id]/prefill/route");
    const response = await POST({} as never, { params: Promise.resolve({ id: "missing" }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("JOB_NOT_FOUND");
  });
});
