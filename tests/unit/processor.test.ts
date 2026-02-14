import fs from "node:fs/promises";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("processJob", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("completes direct single-file flow for word conversion", async () => {
    const updateJobStatus = vi.fn();

    vi.doMock("@/lib/jobs/metadata", () => ({ updateJobStatus }));
    vi.doMock("@/lib/storage/files", () => ({ removePath: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/converters/wordToPdfLibreOffice", () => ({
      convertWordDocxToPdf: vi.fn(async (_inputPath: string, jobId: string) => {
        const output = `/tmp/forgeit/outputs/${jobId}/converted.pdf`;
        await fs.mkdir(path.dirname(output), { recursive: true });
        await fs.writeFile(output, "pdf");
        return output;
      })
    }));

    const { processJob } = await import("@/lib/jobs/processor");

    await processJob({
      id: "job-direct",
      tool: "word.docx_to_pdf",
      files: [
        {
          originalName: "doc.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          storedPath: "/tmp/doc.docx",
          bytes: 100,
          lastModifiedMs: 1000
        }
      ],
      options: { outputSortBy: "name", outputSortDirection: "asc" }
    });

    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job-direct", status: "processing", progress: 15 })
    );
    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-direct",
        status: "completed",
        canDirectDownload: true,
        primaryOutputExt: "pdf",
        sourceFilesAvailable: false
      })
    );
  });

  it("creates zip flow for multi-output split", async () => {
    const updateJobStatus = vi.fn();
    const createOutputZip = vi.fn(async ({ destinationPath }: { destinationPath: string }) => {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.writeFile(destinationPath, "zip");
      return destinationPath;
    });

    vi.doMock("@/lib/jobs/metadata", () => ({ updateJobStatus }));
    vi.doMock("@/lib/storage/files", () => ({ removePath: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/jobs/archive", () => ({ createOutputZip }));
    vi.doMock("@/lib/pdf/operations", async () => {
      const actual = await vi.importActual<typeof import("@/lib/pdf/operations")>("@/lib/pdf/operations");
      return {
        ...actual,
        splitPdf: vi.fn(async (_inputPath: string, _pages: string, outDir: string) => {
          const p1 = path.join(outDir, "page-1.pdf");
          const p2 = path.join(outDir, "page-2.pdf");
          await fs.mkdir(outDir, { recursive: true });
          await fs.writeFile(p1, "p1");
          await fs.writeFile(p2, "p2");
          return [p1, p2];
        })
      };
    });

    const { processJob } = await import("@/lib/jobs/processor");

    await processJob({
      id: "job-zip",
      tool: "pdf.split",
      files: [
        {
          originalName: "doc.pdf",
          mimeType: "application/pdf",
          storedPath: "/tmp/doc.pdf",
          bytes: 100,
          lastModifiedMs: 500
        }
      ],
      options: { splitPages: "1-2", outputSortBy: "date", outputSortDirection: "desc" }
    });

    expect(createOutputZip).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ outputSortBy: "date", outputSortDirection: "desc" })
      })
    );
    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-zip",
        status: "completed",
        canDirectDownload: false,
        primaryOutputExt: "zip"
      })
    );
  });

  it("marks job failed when splitPages option is missing", async () => {
    const updateJobStatus = vi.fn();

    vi.doMock("@/lib/jobs/metadata", () => ({ updateJobStatus }));
    vi.doMock("@/lib/storage/files", () => ({ removePath: vi.fn(async () => undefined) }));

    const { processJob } = await import("@/lib/jobs/processor");

    await expect(
      processJob({
        id: "job-fail",
        tool: "pdf.split",
        files: [
          {
            originalName: "doc.pdf",
            mimeType: "application/pdf",
            storedPath: "/tmp/doc.pdf",
            bytes: 100,
            lastModifiedMs: 1
          }
        ],
        options: {}
      })
    ).rejects.toThrow("splitPages option is required");

    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job-fail", status: "failed", sourceFilesAvailable: false })
    );
  });
});
