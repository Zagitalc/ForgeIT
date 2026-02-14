export const LIMITS = {
  maxFilesPerJob: 20,
  maxFileBytes: 50 * 1024 * 1024,
  maxTotalBytes: 200 * 1024 * 1024,
  maxConcurrentJobs: 2,
  maxQueueSize: 25,
  libreOfficeTimeoutMs: Number(process.env.LIBREOFFICE_TIMEOUT_MS ?? 60_000),
  outputTtlMs: 30 * 60 * 1000,
  failedCleanupTtlMs: 60 * 60 * 1000,
  staleCleanupMs: 24 * 60 * 60 * 1000,
  cleanupIntervalMs: 15 * 60 * 1000
} as const;
