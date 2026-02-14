import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("metadata store", () => {
  let tmpDir = "";
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "forgeit-meta-"));
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates, updates, lists, and cleans jobs", async () => {
    const metadata = await import("@/lib/jobs/metadata");

    metadata.createJobMetadata({
      id: "j1",
      tool: "word.docx_to_pdf",
      inputCount: 1,
      totalBytes: 100,
      options: {},
      sourceFileNames: ["doc.docx"],
      sourceFileModifieds: { "doc.docx": 111 }
    });

    let job = metadata.getJobMetadata("j1");
    expect(job?.sourceFilesAvailable).toBe(true);
    expect(job?.options?.outputSortBy).toBe("name");

    metadata.updateJobStatus({
      id: "j1",
      status: "completed",
      outputCount: 1,
      outputPath: "/tmp/out.pdf",
      primaryOutputExt: "pdf",
      canDirectDownload: true,
      sourceFilesAvailable: false,
      completed: true,
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });

    job = metadata.getJobMetadata("j1");
    expect(job?.status).toBe("completed");
    expect(job?.sourceFilesAvailable).toBe(false);
    expect(job?.canDirectDownload).toBe(true);
    expect(job?.primaryOutputExt).toBe("pdf");

    const cleanup = metadata.listJobsForCleanup(new Date().toISOString());
    expect(cleanup.length).toBe(1);

    metadata.markJobCleaned("j1");
    job = metadata.getJobMetadata("j1");
    expect(job?.outputPath).toBeNull();

    const jobs = metadata.listJobMetadata(10);
    expect(jobs.length).toBe(1);
    expect(jobs[0].canDirectDownload).toBe(false);
    expect(jobs[0].primaryOutputExt).toBe("pdf");

    metadata.clearOutputPath("j1");
    const cleared = metadata.getJobMetadata("j1");
    expect(cleared?.outputPath).toBeNull();
    expect(cleared?.canDirectDownload).toBe(false);

    metadata.deleteJobMetadata("j1");
    expect(metadata.getJobMetadata("j1")).toBeNull();
  });

  it("normalizes legacy rows and applies safety defaults", async () => {
    const jobsPath = path.join(tmpDir, ".forgeit", "jobs.json");
    await fs.mkdir(path.dirname(jobsPath), { recursive: true });
    await fs.writeFile(
      jobsPath,
      JSON.stringify(
        {
          jobs: [
            {
              id: "legacy-1",
              tool: "pdf.merge",
              status: "completed",
              inputCount: 2,
              outputCount: 1,
              totalBytes: 10,
              startedAt: "2026-01-01T00:00:00.000Z",
              completedAt: null,
              errorCode: null,
              errorMessage: null,
              outputPath: "/tmp/result.zip",
              expiresAt: null
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const metadata = await import("@/lib/jobs/metadata");
    const legacy = metadata.getJobMetadata("legacy-1");

    expect(legacy?.options?.outputSortBy).toBe("name");
    expect(legacy?.options?.outputSortDirection).toBe("asc");
    expect(legacy?.sourceFilesAvailable).toBe(false);
    expect(legacy?.displayTool).toBeTruthy();
  });
});
