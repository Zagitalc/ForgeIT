import { describe, expect, it } from "vitest";

import { getDownloadMeta } from "@/lib/jobs/download";
import type { JobRecord } from "@/lib/types/api";

const baseJob: JobRecord = {
  id: "job-1",
  tool: "pdf.merge",
  status: "completed",
  inputCount: 2,
  outputCount: 1,
  totalBytes: 100,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  errorCode: null,
  errorMessage: null,
  outputPath: "/tmp/out.pdf",
  expiresAt: null,
  canDirectDownload: true,
  primaryOutputExt: "pdf"
};

describe("getDownloadMeta", () => {
  it("returns direct file metadata when allowed", () => {
    const meta = getDownloadMeta(baseJob);
    expect(meta.canDirectDownload).toBe(true);
    expect(meta.contentType).toBe("application/pdf");
    expect(meta.fileName).toBe("out.pdf");
  });

  it("falls back to zip metadata", () => {
    const meta = getDownloadMeta({ ...baseJob, outputPath: "/tmp/result.zip", canDirectDownload: false });
    expect(meta.canDirectDownload).toBe(false);
    expect(meta.contentType).toBe("application/zip");
    expect(meta.fileName).toBe("result.zip");
  });
});
