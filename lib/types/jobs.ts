import type { JobOptions, ToolType } from "@/lib/types/api";

export type JobFile = {
  originalName: string;
  mimeType: string;
  storedPath: string;
  bytes: number;
};

export type EnqueuedJob = {
  id: string;
  tool: ToolType;
  files: JobFile[];
  options: JobOptions;
};

export type JobRunResult = {
  outputFiles: string[];
  outputArchivePath?: string;
};
