import path from "node:path";

import type { JobRecord } from "@/lib/types/api";

export function getDownloadMeta(job: JobRecord): {
  canDirectDownload: boolean;
  contentType: string;
  fileName: string;
} {
  const fileName = path.basename(job.outputPath ?? "download.zip");
  const ext = path.extname(fileName).toLowerCase();
  const inferredDirect = ext !== ".zip" && job.outputCount === 1;
  const allowDirect = Boolean(job.canDirectDownload || inferredDirect);

  if (allowDirect && ext !== ".zip") {
    const contentType =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : ext === ".png"
            ? "image/png"
            : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : ext === ".webp"
                ? "image/webp"
                : "application/octet-stream";

    return {
      canDirectDownload: true,
      contentType,
      fileName
    };
  }

  return {
    canDirectDownload: false,
    contentType: "application/zip",
    fileName: fileName.endsWith(".zip") ? fileName : `${fileName}.zip`
  };
}
