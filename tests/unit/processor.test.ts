import fs from "node:fs/promises";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

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

  it("applies filename-date sorting before PDF merge", async () => {
    const updateJobStatus = vi.fn();
    const mergePdfs = vi.fn(async (_inputPaths: string[], outputPath: string) => {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, "merged");
    });

    vi.doMock("@/lib/jobs/metadata", () => ({ updateJobStatus }));
    vi.doMock("@/lib/storage/files", () => ({ removePath: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/pdf/operations", async () => {
      const actual = await vi.importActual<typeof import("@/lib/pdf/operations")>("@/lib/pdf/operations");
      return {
        ...actual,
        mergePdfs
      };
    });

    const { processJob } = await import("@/lib/jobs/processor");
    await processJob({
      id: "job-merge-order",
      tool: "pdf.merge",
      files: [
        {
          originalName: "dec_H80707-040226-102953-0000670901-1.pdf",
          mimeType: "application/pdf",
          storedPath: "/tmp/4-feb-2026.pdf",
          bytes: 100,
          lastModifiedMs: 1
        },
        {
          originalName: "dec_H80707-040625-103912-0000655956-1.pdf",
          mimeType: "application/pdf",
          storedPath: "/tmp/4-jun-2025.pdf",
          bytes: 100,
          lastModifiedMs: 2
        }
      ],
      options: {
        outputSortBy: "filename_date",
        outputSortDirection: "asc",
        filenameDateMode: "smart"
      }
    });

    expect(mergePdfs).toHaveBeenCalledWith(
      ["/tmp/4-jun-2025.pdf", "/tmp/4-feb-2026.pdf"],
      expect.any(String)
    );
    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-merge-order",
        status: "completed",
        sortParseMatched: 2,
        sortParseTotal: 2
      })
    );
  });

  it("completes single-file pdf.compress with direct download and compression stats", async () => {
    const updateJobStatus = vi.fn();

    vi.doMock("@/lib/jobs/metadata", () => ({ updateJobStatus }));
    vi.doMock("@/lib/storage/files", () => ({ removePath: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/pdf/operations", async () => {
      const actual = await vi.importActual<typeof import("@/lib/pdf/operations")>("@/lib/pdf/operations");
      return {
        ...actual,
        compressPdf: vi.fn(async (_inputPath: string, outputPath: string) => {
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, Buffer.alloc(60));
        })
      };
    });

    const { processJob } = await import("@/lib/jobs/processor");
    await processJob({
      id: "job-compress-single",
      tool: "pdf.compress",
      files: [
        {
          originalName: "doc.pdf",
          mimeType: "application/pdf",
          storedPath: "/tmp/doc.pdf",
          bytes: 100,
          lastModifiedMs: 20
        }
      ],
      options: { outputSortBy: "name", outputSortDirection: "asc", pdfCompressMode: "safe" }
    });

    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-compress-single",
        status: "completed",
        canDirectDownload: true,
        primaryOutputExt: "pdf",
        inputBytesBefore: 100,
        outputBytesAfter: 60
      })
    );
  });

  it("routes multi-file pdf.compress output through zip packaging", async () => {
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
        compressPdf: vi.fn(async (_inputPath: string, outputPath: string) => {
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, Buffer.alloc(70));
        })
      };
    });

    const { processJob } = await import("@/lib/jobs/processor");
    await processJob({
      id: "job-compress-batch",
      tool: "pdf.compress",
      files: [
        {
          originalName: "a.pdf",
          mimeType: "application/pdf",
          storedPath: "/tmp/a.pdf",
          bytes: 110,
          lastModifiedMs: 1
        },
        {
          originalName: "b.pdf",
          mimeType: "application/pdf",
          storedPath: "/tmp/b.pdf",
          bytes: 100,
          lastModifiedMs: 2
        }
      ],
      options: { outputSortBy: "name", outputSortDirection: "asc", pdfCompressMode: "safe" }
    });

    expect(createOutputZip).toHaveBeenCalledTimes(1);
    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-compress-batch",
        status: "completed",
        canDirectDownload: false,
        primaryOutputExt: "zip"
      })
    );
  });

  it("marks pdf.compress failed when compressor throws", async () => {
    const updateJobStatus = vi.fn();

    vi.doMock("@/lib/jobs/metadata", () => ({ updateJobStatus }));
    vi.doMock("@/lib/storage/files", () => ({ removePath: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/pdf/operations", async () => {
      const actual = await vi.importActual<typeof import("@/lib/pdf/operations")>("@/lib/pdf/operations");
      return {
        ...actual,
        compressPdf: vi.fn(async () => {
          throw new AppError("PROCESSING_FAILED", "qpdf is required for PDF compression.", "spawn qpdf ENOENT");
        })
      };
    });

    const { processJob } = await import("@/lib/jobs/processor");
    await expect(
      processJob({
        id: "job-compress-fail",
        tool: "pdf.compress",
        files: [
          {
            originalName: "doc.pdf",
            mimeType: "application/pdf",
            storedPath: "/tmp/doc.pdf",
            bytes: 80,
            lastModifiedMs: 1
          }
        ],
        options: { pdfCompressMode: "safe" }
      })
    ).rejects.toThrow("qpdf is required for PDF compression.");

    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-compress-fail",
        status: "failed",
        errorCode: "PROCESSING_FAILED"
      })
    );
  });

  it("persists merge failure details for actionable troubleshooting", async () => {
    const updateJobStatus = vi.fn();

    vi.doMock("@/lib/jobs/metadata", () => ({ updateJobStatus }));
    vi.doMock("@/lib/storage/files", () => ({ removePath: vi.fn(async () => undefined) }));
    vi.doMock("@/lib/pdf/operations", async () => {
      const actual = await vi.importActual<typeof import("@/lib/pdf/operations")>("@/lib/pdf/operations");
      return {
        ...actual,
        mergePdfs: vi.fn(async () => {
          throw new AppError(
            "PROCESSING_FAILED",
            "Cannot merge Statement_01-DEC-25.pdf. The file may be encrypted, corrupted, or not a valid PDF.",
            "Input document to PDFDocument.load is encrypted."
          );
        })
      };
    });

    const { processJob } = await import("@/lib/jobs/processor");

    await expect(
      processJob({
        id: "job-merge-fail",
        tool: "pdf.merge",
        files: [
          {
            originalName: "a.pdf",
            mimeType: "application/pdf",
            storedPath: "/tmp/a.pdf",
            bytes: 100,
            lastModifiedMs: 1
          },
          {
            originalName: "b.pdf",
            mimeType: "application/pdf",
            storedPath: "/tmp/b.pdf",
            bytes: 100,
            lastModifiedMs: 2
          }
        ],
        options: { outputSortBy: "name", outputSortDirection: "asc" }
      })
    ).rejects.toThrow("Cannot merge Statement_01-DEC-25.pdf");

    expect(updateJobStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-merge-fail",
        status: "failed",
        errorCode: "PROCESSING_FAILED",
        errorMessage:
          "Cannot merge Statement_01-DEC-25.pdf. The file may be encrypted, corrupted, or not a valid PDF. (Input document to PDFDocument.load is encrypted.)"
      })
    );
  });
});
