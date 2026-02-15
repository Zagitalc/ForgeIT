import fs from "node:fs/promises";
import path from "node:path";

import { LIMITS } from "@/lib/config/limits";
import { convertWordDocxToPdf } from "@/lib/converters/wordToPdfLibreOffice";
import { AppError } from "@/lib/errors";
import { convertHtmlToPdf } from "@/lib/html/htmlToPdf";
import { processImages } from "@/lib/image/process";
import { createOutputZip } from "@/lib/jobs/archive";
import { updateJobStatus } from "@/lib/jobs/metadata";
import { sortJobFiles } from "@/lib/sort/jobFiles";
import { countFilenameDateMatches } from "@/lib/sort/filenameDate";
import { convertMarkdownToDocx } from "@/lib/markdown/markdownToDocx";
import { imagesToPdf, mergePdfs, splitPdf, rotatePdf, addPageNumbers } from "@/lib/pdf/operations";
import { convertPdfToImages } from "@/lib/pdf/pdfToImages";
import { removePath } from "@/lib/storage/files";
import { libreOfficeProfileDir, outputsDir, processingDir, uploadsDir } from "@/lib/storage/paths";
import type { EnqueuedJob } from "@/lib/types/jobs";
import { assertExtension } from "@/lib/validators";

type AppErrorShape = {
  code: string;
  message: string;
  details?: string;
};

function addTtl(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function isAppErrorShape(error: unknown): error is AppErrorShape {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as Partial<AppErrorShape>;
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}

export async function processJob(job: EnqueuedJob): Promise<void> {
  updateJobStatus({ id: job.id, status: "processing", progress: 15 });

  const outputDirectory = outputsDir(job.id);
  const workDirectory = processingDir(job.id);

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.mkdir(workDirectory, { recursive: true });

  let outputFiles: string[] = [];
  let sortParseMatched: number | undefined;
  let sortParseTotal: number | undefined;
  const sortedFiles = sortJobFiles(job.files, job.options);

  if (job.options.outputSortBy === "filename_date") {
    const counts = countFilenameDateMatches(
      sortedFiles.map((file) => file.originalName),
      job.options
    );
    sortParseMatched = counts.matched;
    sortParseTotal = counts.total;
  }

  try {
    switch (job.tool) {
      case "word.docx_to_pdf": {
        outputFiles = [];
        for (const file of sortedFiles) {
          assertExtension(file.originalName, ["docx"]);
          const output = await convertWordDocxToPdf(file.storedPath, job.id);
          outputFiles.push(output);
        }
        break;
      }
      case "convert.html_pdf": {
        for (const file of sortedFiles) {
          assertExtension(file.originalName, ["html", "htm"]);
          const html = await fs.readFile(file.storedPath, "utf8");
          const output = path.join(workDirectory, `${path.parse(file.originalName).name}.pdf`);
          await convertHtmlToPdf(html, output);
          outputFiles.push(output);
        }
        break;
      }
      case "convert.markdown_docx": {
        for (const file of sortedFiles) {
          assertExtension(file.originalName, ["md", "markdown"]);
          const markdown = await fs.readFile(file.storedPath, "utf8");
          const output = path.join(workDirectory, `${path.parse(file.originalName).name}.docx`);
          await convertMarkdownToDocx(markdown, output);
          outputFiles.push(output);
        }
        break;
      }
      case "pdf.merge": {
        if (sortedFiles.length < 2) {
          throw new AppError("VALIDATION_ERROR", "PDF merge requires at least 2 PDF files.");
        }
        sortedFiles.forEach((file) => assertExtension(file.originalName, ["pdf"]));
        const output = path.join(workDirectory, "merged.pdf");
        await mergePdfs(sortedFiles.map((file) => file.storedPath), output);
        outputFiles = [output];
        break;
      }
      case "pdf.split": {
        if (sortedFiles.length !== 1) {
          throw new AppError("VALIDATION_ERROR", "PDF split requires exactly one input PDF.");
        }
        assertExtension(sortedFiles[0].originalName, ["pdf"]);
        const pageSpec = job.options.splitPages;
        if (!pageSpec) {
          throw new AppError("VALIDATION_ERROR", "splitPages option is required for PDF split.");
        }
        outputFiles = await splitPdf(sortedFiles[0].storedPath, pageSpec, workDirectory);
        break;
      }
      case "pdf.rotate": {
        if (sortedFiles.length === 0) {
          throw new AppError("VALIDATION_ERROR", "PDF rotate requires at least one PDF.");
        }
        const degrees = job.options.rotateDegrees ?? 90;
        for (const file of sortedFiles) {
          assertExtension(file.originalName, ["pdf"]);
          const output = path.join(workDirectory, `${path.parse(file.originalName).name}-rotated.pdf`);
          await rotatePdf(file.storedPath, output, degrees);
          outputFiles.push(output);
        }
        break;
      }
      case "pdf.page_numbers": {
        if (sortedFiles.length === 0) {
          throw new AppError("VALIDATION_ERROR", "PDF page numbering requires at least one PDF.");
        }
        for (const file of sortedFiles) {
          assertExtension(file.originalName, ["pdf"]);
          const output = path.join(workDirectory, `${path.parse(file.originalName).name}-numbered.pdf`);
          await addPageNumbers(file.storedPath, output, job.options.pageNumberStart ?? 1);
          outputFiles.push(output);
        }
        break;
      }
      case "pdf.to_images": {
        if (sortedFiles.length !== 1) {
          throw new AppError("VALIDATION_ERROR", "PDF to images requires exactly one PDF input.");
        }
        assertExtension(sortedFiles[0].originalName, ["pdf"]);
        outputFiles = await convertPdfToImages(sortedFiles[0].storedPath, workDirectory);
        break;
      }
      case "image.process": {
        for (const file of sortedFiles) {
          assertExtension(file.originalName, ["png", "jpg", "jpeg", "webp"]);
        }
        outputFiles = await processImages(
          sortedFiles.map((file) => file.storedPath),
          workDirectory,
          {
            width: job.options.imageWidth,
            height: job.options.imageHeight,
            format: job.options.imageFormat,
            quality: job.options.imageQuality
          }
        );
        break;
      }
      case "convert.images_pdf": {
        if (sortedFiles.length === 0) {
          throw new AppError("VALIDATION_ERROR", "Images to PDF requires at least one image.");
        }
        for (const file of sortedFiles) {
          assertExtension(file.originalName, ["png", "jpg", "jpeg"]);
        }
        const output = path.join(workDirectory, "images-to-pdf.pdf");
        await imagesToPdf(sortedFiles.map((file) => file.storedPath), output);
        outputFiles = [output];
        break;
      }
      default:
        throw new AppError("VALIDATION_ERROR", "Unsupported tool type.");
    }

    if (outputFiles.length === 0) {
      throw new AppError("PROCESSING_FAILED", "No outputs were generated.");
    }

    let outputPath: string;
    let canDirectDownload = false;
    let primaryOutputExt = "zip";

    if (outputFiles.length === 1) {
      const singleOutput = outputFiles[0];
      const target = path.join(outputDirectory, path.basename(singleOutput));
      if (singleOutput !== target) {
        await fs.copyFile(singleOutput, target);
      }
      outputPath = target;
      primaryOutputExt = path.extname(target).replace(".", "").toLowerCase() || "bin";
      canDirectDownload = true;
    } else {
      const archivePath = path.join(outputDirectory, "result.zip");
      await createOutputZip({
        inputNames: sortedFiles.map((file) => file.originalName),
        outputPaths: outputFiles,
        sourceModifieds: sortedFiles.map((file) => file.lastModifiedMs),
        options: job.options,
        namingPattern: job.options.namingPattern,
        tool: job.tool,
        destinationPath: archivePath,
        onParseStats: ({ matched, total }) => {
          sortParseMatched = matched;
          sortParseTotal = total;
        }
      });
      outputPath = archivePath;
      canDirectDownload = false;
      primaryOutputExt = "zip";
    }

    await removePath(uploadsDir(job.id));
    await removePath(workDirectory);
    await removePath(libreOfficeProfileDir(job.id));

    updateJobStatus({
      id: job.id,
      status: "completed",
      progress: 100,
      outputCount: outputFiles.length,
      outputPath,
      displayName: path.basename(outputPath),
      primaryOutputExt,
      canDirectDownload,
      sortParseMatched,
      sortParseTotal,
      sourceFilesAvailable: false,
      completed: true,
      expiresAt: addTtl(LIMITS.outputTtlMs)
    });
  } catch (error) {
    await removePath(workDirectory);
    await removePath(libreOfficeProfileDir(job.id));

    const appError = error instanceof AppError
      ? error
      : isAppErrorShape(error)
        ? new AppError(
            error.code as AppError["code"],
            error.message,
            typeof error.details === "string" ? error.details : undefined
          )
        : new AppError("PROCESSING_FAILED", "Job processing failed.", error instanceof Error ? error.message : undefined);
    const persistedErrorMessage = appError.details
      ? `${appError.message} (${appError.details})`
      : appError.message;

    updateJobStatus({
      id: job.id,
      status: "failed",
      progress: 100,
      errorCode: appError.code,
      errorMessage: persistedErrorMessage,
      sourceFilesAvailable: false,
      completed: true,
      expiresAt: addTtl(LIMITS.failedCleanupTtlMs)
    });

    throw appError;
  }
}
