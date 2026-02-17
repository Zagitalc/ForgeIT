import fs from "node:fs";
import path from "node:path";

import { getToolLabel } from "@/lib/jobs/display";
import type { ErrorCode, JobOptions, JobRecord, JobStatus, ToolType } from "@/lib/types/api";

const DB_DIR = path.join(process.cwd(), ".forgeit");
const DB_PATH = path.join(DB_DIR, "jobs.json");

type JobStore = {
  jobs: JobRecord[];
};

function ensureStore(): void {
  fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const initial: JobStore = { jobs: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

function normalizeJob(job: JobRecord): JobRecord {
  const outputExt = job.outputPath
    ? path.extname(job.outputPath).replace(".", "").toLowerCase()
    : job.primaryOutputExt;
  const inferredDirect = Boolean(job.outputPath && path.extname(job.outputPath).toLowerCase() !== ".zip" && job.outputCount === 1);

  return {
    ...job,
    displayTool: job.displayTool ?? getToolLabel(job.tool),
    displayName: job.displayName ?? undefined,
    progress:
      typeof job.progress === "number"
        ? job.progress
        : job.status === "completed" || job.status === "failed"
          ? 100
          : 0,
    primaryOutputExt: job.primaryOutputExt ?? outputExt ?? undefined,
    canDirectDownload: Boolean(job.canDirectDownload || inferredDirect),
    options: {
      outputSortBy: "name",
      outputSortDirection: "asc",
      filenameDateMode: "smart",
      filenameDateDateFormat: "DDMMYY",
      filenameDateTimeFormat: "HHMMSS",
      filenameDateIgnoreCase: false,
      ...(job.options ?? {})
    },
    sourceFileNames: job.sourceFileNames ?? [],
    sourceFileModifieds: job.sourceFileModifieds ?? {},
    sourceFilesAvailable: Boolean(job.sourceFilesAvailable),
    sortParseMatched: typeof job.sortParseMatched === "number" ? job.sortParseMatched : undefined,
    sortParseTotal: typeof job.sortParseTotal === "number" ? job.sortParseTotal : undefined,
    inputBytesBefore: typeof job.inputBytesBefore === "number" ? job.inputBytesBefore : undefined,
    outputBytesAfter: typeof job.outputBytesAfter === "number" ? job.outputBytesAfter : undefined,
    compressionSavingsPct: typeof job.compressionSavingsPct === "number" ? job.compressionSavingsPct : undefined
  };
}

function readStore(): JobStore {
  ensureStore();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as JobStore;
    if (!Array.isArray(parsed.jobs)) {
      return { jobs: [] };
    }
    return { jobs: parsed.jobs.map((job) => normalizeJob(job)) };
  } catch {
    return { jobs: [] };
  }
}

function writeStore(store: JobStore): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function createJobMetadata(params: {
  id: string;
  tool: ToolType;
  inputCount: number;
  totalBytes: number;
  options: JobOptions;
  sourceFileNames: string[];
  sourceFileModifieds: Record<string, number>;
}): void {
  const store = readStore();
  const record: JobRecord = {
    id: params.id,
    tool: params.tool,
    displayTool: getToolLabel(params.tool),
    status: "queued",
    progress: 0,
    inputCount: params.inputCount,
    outputCount: 0,
    totalBytes: params.totalBytes,
    startedAt: new Date().toISOString(),
    completedAt: null,
    errorCode: null,
    errorMessage: null,
    outputPath: null,
    primaryOutputExt: undefined,
    canDirectDownload: false,
    options: {
      outputSortBy: "name",
      outputSortDirection: "asc",
      filenameDateMode: "smart",
      filenameDateDateFormat: "DDMMYY",
      filenameDateTimeFormat: "HHMMSS",
      filenameDateIgnoreCase: false,
      ...params.options
    },
    sourceFileNames: params.sourceFileNames,
    sourceFileModifieds: params.sourceFileModifieds,
    sourceFilesAvailable: true,
    inputBytesBefore: undefined,
    outputBytesAfter: undefined,
    compressionSavingsPct: undefined,
    expiresAt: null
  };

  store.jobs = [record, ...store.jobs.filter((job) => job.id !== params.id)];
  writeStore(store);
}

export function updateJobStatus(params: {
  id: string;
  status: JobStatus;
  progress?: number;
  outputCount?: number;
  outputPath?: string | null;
  displayName?: string;
  primaryOutputExt?: string;
  canDirectDownload?: boolean;
  sourceFilesAvailable?: boolean;
  sortParseMatched?: number;
  sortParseTotal?: number;
  inputBytesBefore?: number;
  outputBytesAfter?: number;
  compressionSavingsPct?: number;
  errorCode?: ErrorCode | null;
  errorMessage?: string | null;
  completed?: boolean;
  expiresAt?: string | null;
}): void {
  const store = readStore();
  const index = store.jobs.findIndex((job) => job.id === params.id);
  if (index === -1) {
    return;
  }

  const existing = store.jobs[index];
  const updated: JobRecord = {
    ...existing,
    status: params.status,
    progress: typeof params.progress === "number" ? params.progress : existing.progress,
    outputCount: params.outputCount ?? existing.outputCount,
    outputPath: params.outputPath ?? existing.outputPath,
    displayName: params.displayName ?? existing.displayName,
    primaryOutputExt: params.primaryOutputExt ?? existing.primaryOutputExt,
    canDirectDownload: params.canDirectDownload ?? existing.canDirectDownload,
    sourceFilesAvailable: params.sourceFilesAvailable ?? existing.sourceFilesAvailable,
    sortParseMatched: params.sortParseMatched ?? existing.sortParseMatched,
    sortParseTotal: params.sortParseTotal ?? existing.sortParseTotal,
    inputBytesBefore: params.inputBytesBefore ?? existing.inputBytesBefore,
    outputBytesAfter: params.outputBytesAfter ?? existing.outputBytesAfter,
    compressionSavingsPct: params.compressionSavingsPct ?? existing.compressionSavingsPct,
    errorCode: params.errorCode ?? null,
    errorMessage: params.errorMessage ?? null,
    completedAt: params.completed ? new Date().toISOString() : existing.completedAt,
    expiresAt: params.expiresAt ?? existing.expiresAt
  };

  store.jobs[index] = updated;
  writeStore(store);
}

export function getJobMetadata(id: string): JobRecord | null {
  const store = readStore();
  return store.jobs.find((job) => job.id === id) ?? null;
}

export function listJobMetadata(limit = 100): JobRecord[] {
  const store = readStore();
  return [...store.jobs]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}

export function clearOutputPath(id: string): void {
  const store = readStore();
  store.jobs = store.jobs.map((job) =>
    job.id === id ? { ...job, outputPath: null, canDirectDownload: false } : job
  );
  writeStore(store);
}

export function deleteJobMetadata(id: string): void {
  const store = readStore();
  store.jobs = store.jobs.filter((job) => job.id !== id);
  writeStore(store);
}

export function listJobsForCleanup(nowIso: string): JobRecord[] {
  const now = new Date(nowIso).getTime();
  const store = readStore();

  return store.jobs.filter((job) => {
    if (!job.expiresAt) {
      return false;
    }
    return new Date(job.expiresAt).getTime() <= now;
  });
}

export function markJobCleaned(id: string): void {
  const store = readStore();
  store.jobs = store.jobs.map((job) =>
    job.id === id
      ? { ...job, outputPath: null, expiresAt: null, canDirectDownload: false, sourceFilesAvailable: false }
      : job
  );
  writeStore(store);
}
