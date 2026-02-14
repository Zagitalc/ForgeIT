"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getTabForTool, getToolLabel } from "@/lib/jobs/display";
import type { JobOptions, JobRecord, ToolType } from "@/lib/types/api";

const TABS = ["Convert", "PDF", "Images"] as const;
type Tab = (typeof TABS)[number];

type HealthResponse = {
  ok: boolean;
  data: {
    libreOffice: { available: boolean; path: string | null };
    queue: { active: number; queued: number };
  };
};

type JobsResponse = {
  ok: boolean;
  data: {
    jobs: JobRecord[];
    queue: { active: number; queued: number };
  };
};

type Toast = {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
};

const TOOL_OPTIONS: Array<{ label: string; value: ToolType; tab: Tab; accepts: string }> = [
  { label: "Word (.docx) -> PDF", value: "word.docx_to_pdf", tab: "Convert", accepts: ".docx" },
  { label: "HTML -> PDF", value: "convert.html_pdf", tab: "Convert", accepts: ".html,.htm" },
  { label: "Markdown -> DOCX", value: "convert.markdown_docx", tab: "Convert", accepts: ".md,.markdown" },
  { label: "Merge PDFs", value: "pdf.merge", tab: "PDF", accepts: ".pdf" },
  { label: "Split PDF", value: "pdf.split", tab: "PDF", accepts: ".pdf" },
  { label: "Rotate PDFs", value: "pdf.rotate", tab: "PDF", accepts: ".pdf" },
  { label: "Add Page Numbers", value: "pdf.page_numbers", tab: "PDF", accepts: ".pdf" },
  { label: "PDF -> Images", value: "pdf.to_images", tab: "PDF", accepts: ".pdf" },
  { label: "Process Images", value: "image.process", tab: "Images", accepts: ".jpg,.jpeg,.png,.webp" },
  { label: "Images -> PDF", value: "convert.images_pdf", tab: "Images", accepts: ".jpg,.jpeg,.png" }
];

const TOKENS = ["{original}", "{tool}", "{index}", "{date:YYYY-MM-DD}"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function joinUniqueFiles(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
  const next = [...existing];
  for (const file of incoming) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      next.push(file);
    }
  }
  return next;
}

export function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("Convert");
  const [tool, setTool] = useState<ToolType>("word.docx_to_pdf");
  const [files, setFiles] = useState<File[]>([]);
  const [splitPages, setSplitPages] = useState("1-2");
  const [rotateDegrees, setRotateDegrees] = useState<90 | 180 | 270>(90);
  const [imageFormat, setImageFormat] = useState<"jpeg" | "png" | "webp">("jpeg");
  const [imageQuality, setImageQuality] = useState(80);
  const [namingPattern, setNamingPattern] = useState("{original}-{tool}-{index}");
  const [outputSortBy, setOutputSortBy] = useState<"name" | "date">("name");
  const [outputSortDirection, setOutputSortDirection] = useState<"asc" | "desc">("asc");
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [health, setHealth] = useState<HealthResponse["data"] | null>(null);
  const [historySort, setHistorySort] = useState<"date" | "type">("date");
  const [dragOver, setDragOver] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showQueuePolicy, setShowQueuePolicy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const filteredTools = useMemo(() => TOOL_OPTIONS.filter((option) => option.tab === tab), [tab]);
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      if (historySort === "type") {
        return (a.displayTool ?? getToolLabel(a.tool)).localeCompare(b.displayTool ?? getToolLabel(b.tool));
      }
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }, [historySort, jobs]);

  const activeJob = useMemo(
    () => jobs.find((job) => job.status === "processing" || job.status === "queued"),
    [jobs]
  );

  const selectedTool = TOOL_OPTIONS.find((option) => option.value === tool);
  const canSubmit = files.length > 0 && !loading && !(tool === "word.docx_to_pdf" && !health?.libreOffice.available);

  useEffect(() => {
    const firstTool = filteredTools[0];
    if (firstTool && !filteredTools.some((item) => item.value === tool)) {
      setTool(firstTool.value);
    }
  }, [filteredTools, tool]);

  useEffect(() => {
    void fetchHealth();
    void fetchJobs();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchJobs();
      if (jobId) {
        void fetchJob(jobId);
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [jobId]);

  function pushToast(kind: Toast["kind"], toastMessage: string): void {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, kind, message: toastMessage }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }

  async function fetchHealth(): Promise<void> {
    const response = await fetch("/api/health");
    const payload = (await response.json()) as HealthResponse;
    if (payload.ok) {
      setHealth(payload.data);
    }
  }

  async function fetchJobs(): Promise<void> {
    const response = await fetch("/api/jobs");
    const payload = (await response.json()) as JobsResponse;
    if (payload.ok) {
      setJobs(payload.data.jobs);
    }
  }

  async function fetchJob(id: string): Promise<void> {
    const response = await fetch(`/api/jobs/${id}`);
    const payload = await response.json();
    if (!payload.ok) {
      return;
    }

    const data = payload.data as JobRecord;
    if (data.status === "completed") {
      setMessage(`Job ${id} completed.`);
      pushToast("success", `${data.displayTool ?? getToolLabel(data.tool)} completed`);
    }
    if (data.status === "failed") {
      setMessage(data.errorMessage ?? "Job failed.");
      pushToast("error", data.errorMessage ?? "Job failed");
    }
  }

  function buildOptions(): JobOptions {
    return {
      namingPattern,
      outputSortBy,
      outputSortDirection,
      splitPages,
      rotateDegrees,
      imageFormat,
      imageQuality
    };
  }

  function appendFiles(incoming: File[]): void {
    setFiles((prev) => joinUniqueFiles(prev, incoming));
  }

  function onDrop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setDragOver(false);
    const dropped = [...event.dataTransfer.files];
    appendFiles(dropped);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      setMessage("Select files and resolve dependency issues first.");
      return;
    }

    setLoading(true);
    setMessage("Submitting job...");
    pushToast("info", "Submitting job");

    const formData = new FormData();
    formData.set("tool", tool);
    formData.set("options", JSON.stringify(buildOptions()));
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/jobs", {
      method: "POST",
      body: formData
    });

    const payload = await response.json();
    setLoading(false);

    if (!payload.ok) {
      setMessage(payload.error?.message ?? "Job submission failed.");
      pushToast("error", payload.error?.message ?? "Job submission failed");
      return;
    }

    setJobId(payload.jobId);
    setMessage(`Job ${payload.jobId} queued.`);
    pushToast("success", `Job ${payload.jobId} queued`);
    await fetchJobs();
  }

  async function download(job: JobRecord): Promise<void> {
    try {
      const response = await fetch(`/api/jobs/${job.id}/download`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const messageText =
          payload?.error?.message ??
          "Job output is no longer available. Re-run the job to regenerate output.";
        pushToast("error", messageText);
        return;
      }

      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const fileName = filenameMatch?.[1] ?? "download.bin";

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      pushToast("error", "Download failed. Please try again.");
    }
  }

  async function rerun(job: JobRecord): Promise<void> {
    const response = await fetch(`/api/jobs/${job.id}/rerun`, { method: "POST" });
    const payload = await response.json();
    if (!payload.ok) {
      pushToast("error", payload.error?.message ?? "Unable to prepare rerun");
      return;
    }

    pushToast("success", payload.data?.message ?? "Rerun accepted.");
    await fetchJobs();
  }

  async function reuseSettings(job: JobRecord): Promise<void> {
    const response = await fetch(`/api/jobs/${job.id}/prefill`, { method: "POST" });
    const payload = await response.json();
    if (!payload.ok) {
      pushToast("error", payload.error?.message ?? "Unable to load previous settings");
      return;
    }

    const nextTool = payload.data.tool as ToolType;
    const options = (payload.data.options ?? {}) as JobOptions;

    setTab(getTabForTool(nextTool));
    setTool(nextTool);
    setNamingPattern(options.namingPattern ?? "{original}-{tool}-{index}");
    setOutputSortBy(options.outputSortBy ?? "name");
    setOutputSortDirection(options.outputSortDirection ?? "asc");
    setSplitPages(options.splitPages ?? "1-2");
    setRotateDegrees(options.rotateDegrees ?? 90);
    setImageFormat(options.imageFormat ?? "jpeg");
    setImageQuality(options.imageQuality ?? 80);
    setMessage(payload.data.message);
    pushToast("info", "Settings loaded. Attach files and start a new job.");
  }

  async function removeHistory(job: JobRecord): Promise<void> {
    const previous = jobs;
    setJobs((current) => current.filter((item) => item.id !== job.id));

    const response = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    const payload = await response.json();

    if (!payload.ok) {
      setJobs(previous);
      pushToast("error", payload.error?.message ?? "Delete failed");
      return;
    }

    pushToast("success", "History item deleted");
  }

  function insertToken(token: string): void {
    setNamingPattern((prev) => (prev.includes(token) ? prev : `${prev}${prev ? "-" : ""}${token}`));
  }

  function removeFile(index: number): void {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function outputLabel(job: JobRecord): string {
    const ext =
      job.primaryOutputExt ??
      (job.outputPath ? job.outputPath.split(".").pop()?.toLowerCase() : undefined);
    const inferredDirect = Boolean(job.outputPath && !job.outputPath.endsWith(".zip") && job.outputCount === 1);
    const toolFallbackExt: Partial<Record<ToolType, string>> = {
      "word.docx_to_pdf": "pdf",
      "convert.html_pdf": "pdf",
      "convert.images_pdf": "pdf",
      "convert.markdown_docx": "docx",
      "pdf.merge": "pdf",
      "pdf.rotate": "pdf",
      "pdf.page_numbers": "pdf"
    };
    const fallbackExt = job.outputCount === 1 ? toolFallbackExt[job.tool] : undefined;

    if ((job.canDirectDownload || inferredDirect) && (ext || fallbackExt) && (ext ?? fallbackExt) !== "zip") {
      return `Download ${(ext ?? fallbackExt ?? "file").toUpperCase()}`;
    }

    if (job.outputCount === 1 && fallbackExt) {
      return `Download ${fallbackExt.toUpperCase()}`;
    }
    return "Download ZIP";
  }

  function canDownload(job: JobRecord): boolean {
    return job.status === "completed" && Boolean(job.outputPath);
  }

  const previewName =
    files[0]?.name.replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .concat(`-${tool}-1`) ?? "sample-output";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="panel relative z-30 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">ForgeIT</h1>
          <p className="text-sm text-[var(--muted)]">
            Local-first converter for private workflows.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          {health && (
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  health.libreOffice.available
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : "border-rose-300 bg-rose-100 text-rose-800"
                }`}
              >
                LibreOffice {health.libreOffice.available ? "Ready" : "Missing"}
              </span>
              <button
                type="button"
                aria-label="Offline scope and dependency info"
                className="btn-ghost h-8 w-8 rounded-full p-0"
                onClick={() => setShowInfo((prev) => !prev)}
              >
                i
              </button>
            </div>
          )}
          <ThemeToggle />

          {showInfo && (
            <div
              role="tooltip"
              className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-forge-300 bg-[var(--bg-elevated)] p-3 text-xs text-[var(--muted)] shadow-lg dark:border-forge-600"
            >
              UI shell can load from cache. New conversions require local server runtime and dependencies.
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1fr,320px]">
        <div className="panel">
          <nav className="mb-4 flex flex-wrap gap-2" aria-label="Tool categories">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`tab-btn ${
                  tab === item
                    ? "border-forge-500 bg-forge-500 text-white"
                    : "border-forge-300 bg-forge-100 text-forge-800 dark:border-forge-600 dark:bg-forge-800/60 dark:text-forge-100"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold">Tool</label>
            <select
              className="input"
              value={tool}
              onChange={(event) => setTool(event.target.value as ToolType)}
              aria-label="Select conversion tool"
            >
              {filteredTools.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold">Files</label>
            <button
              type="button"
              className={`dropzone w-full ${dragOver ? "border-forge-500 bg-forge-100/70 dark:bg-forge-800/40" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Drop files here or click to browse"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={selectedTool?.accepts}
                onChange={(event) => appendFiles([...(event.target.files ?? [])])}
              />
              <p className="text-sm font-semibold">Drop files here or click to browse</p>
              <p className="text-xs text-[var(--muted)]">{files.length} selected • max 20 files • max 50MB each</p>
            </button>

            {files.length > 0 && (
              <ul className="space-y-2" aria-label="Selected files">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-forge-200 bg-forge-50/70 px-3 py-2 text-sm dark:border-forge-600 dark:bg-forge-800/30"
                  >
                    <span className="truncate">{file.name} ({formatBytes(file.size)})</span>
                    <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => removeFile(index)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {tool === "pdf.split" && (
              <div>
                <label className="mb-1 block text-sm font-semibold">Page range (e.g. 1,3-5)</label>
                <input className="input" value={splitPages} onChange={(event) => setSplitPages(event.target.value)} />
              </div>
            )}

            {tool === "pdf.rotate" && (
              <div>
                <label className="mb-1 block text-sm font-semibold">Rotate Degrees</label>
                <select
                  className="input"
                  value={rotateDegrees}
                  onChange={(event) => setRotateDegrees(Number(event.target.value) as 90 | 180 | 270)}
                >
                  <option value={90}>90</option>
                  <option value={180}>180</option>
                  <option value={270}>270</option>
                </select>
              </div>
            )}

            {tool === "image.process" && (
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Format</label>
                  <select
                    className="input"
                    value={imageFormat}
                    onChange={(event) => setImageFormat(event.target.value as "jpeg" | "png" | "webp")}
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WEBP</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Quality</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={100}
                    value={imageQuality}
                    onChange={(event) => setImageQuality(Number(event.target.value))}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold">Naming Pattern</label>
              <input
                className="input"
                value={namingPattern}
                onChange={(event) => setNamingPattern(event.target.value)}
                placeholder="{original}-{tool}-{index}"
              />
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Sort outputs by
                  </label>
                  <select
                    className="input"
                    value={outputSortBy}
                    onChange={(event) => setOutputSortBy(event.target.value as "name" | "date")}
                  >
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Direction
                  </label>
                  <select
                    className="input"
                    value={outputSortDirection}
                    onChange={(event) => setOutputSortDirection(event.target.value as "asc" | "desc")}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {TOKENS.map((token) => (
                  <button key={token} type="button" className="token-chip" onClick={() => insertToken(token)}>
                    + {token}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Preview: <code className="rounded bg-forge-100 px-1 py-0.5 dark:bg-forge-800">{previewName}</code>
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Sort order controls output package file order and index token numbering.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn" type="submit" disabled={!canSubmit}>
                {loading ? "Submitting..." : "Start Job"}
              </button>
              <p className="text-sm text-[var(--muted)]" aria-live="polite">
                {message}
              </p>
            </div>
          </form>
        </div>

        <aside className="panel space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Queue</h2>
            <button
              type="button"
              aria-label="Queue limits and policy"
              className="btn-ghost h-8 w-8 rounded-full p-0"
              onClick={() => setShowQueuePolicy((prev) => !prev)}
            >
              i
            </button>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Active: {health?.queue.active ?? 0} | Queued: {health?.queue.queued ?? 0}
          </p>
          {activeJob && (
            <div className="rounded-xl border border-forge-300 bg-forge-100/70 p-3 text-xs dark:border-forge-600 dark:bg-forge-800/40">
              <p className="font-semibold">Current</p>
              <p>{activeJob.displayTool ?? getToolLabel(activeJob.tool)}</p>
              <p>Progress: {activeJob.progress ?? (activeJob.status === "completed" ? 100 : 0)}%</p>
            </div>
          )}
          {showQueuePolicy && (
            <div className="rounded-xl border border-forge-300 bg-forge-50/70 p-3 text-xs text-[var(--muted)] dark:border-forge-600 dark:bg-forge-800/30">
              Limits: 20 files/job, 50MB/file, 200MB total, 2 concurrent jobs. Word conversion runs single-file mutex.
            </div>
          )}
        </aside>
      </section>

      <section className="panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">History</h2>
          <div className="flex gap-2">
            <select
              className="input w-auto min-w-32"
              value={historySort}
              onChange={(event) => setHistorySort(event.target.value as "date" | "type")}
            >
              <option value="date">Sort: Date</option>
              <option value="type">Sort: Type</option>
            </select>
            <button className="btn-ghost" type="button" onClick={() => void fetchJobs()}>
              Refresh
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-forge-200 dark:border-forge-700">
                <th className="py-2">Job</th>
                <th className="py-2">Tool</th>
                <th className="py-2">Status</th>
                <th className="py-2">Started</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job) => (
                <tr key={job.id} className="border-b border-forge-100 align-middle dark:border-forge-800">
                  <td className="py-2 font-mono text-xs">{job.id}</td>
                  <td className="py-2">{job.displayTool ?? getToolLabel(job.tool)}</td>
                  <td className="py-2">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="py-2 text-xs" title={new Date(job.startedAt).toLocaleString()}>
                    {relativeTime(job.startedAt)}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      {canDownload(job) && (
                        <button type="button" className="btn-ghost" onClick={() => void download(job)}>
                          {outputLabel(job)}
                        </button>
                      )}
                      {job.status === "completed" && !job.outputPath && (
                        <span className="rounded-xl border border-forge-200 px-3 py-2 text-xs text-[var(--muted)] dark:border-forge-700">
                          Output expired
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => void rerun(job)}
                        disabled={!job.sourceFilesAvailable}
                        title={job.sourceFilesAvailable ? "Re-run now" : "Source files expired"}
                      >
                        Re-run
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => void reuseSettings(job)}>
                        Reuse Settings
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => void removeHistory(job)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {sortedJobs.map((job) => (
            <article key={job.id} className="rounded-xl border border-forge-200 p-3 dark:border-forge-700">
              <p className="font-mono text-xs">{job.id}</p>
              <p className="mt-1 text-sm font-semibold">{job.displayTool ?? getToolLabel(job.tool)}</p>
              <div className="mt-2 flex items-center justify-between">
                <StatusBadge status={job.status} />
                <span className="text-xs text-[var(--muted)]" title={new Date(job.startedAt).toLocaleString()}>
                  {relativeTime(job.startedAt)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {canDownload(job) && (
                  <button type="button" className="btn-ghost" onClick={() => void download(job)}>
                    {outputLabel(job)}
                  </button>
                )}
                {job.status === "completed" && !job.outputPath && (
                  <span className="rounded-xl border border-forge-200 px-3 py-2 text-xs text-[var(--muted)] dark:border-forge-700">
                    Output expired
                  </span>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void rerun(job)}
                  disabled={!job.sourceFilesAvailable}
                  title={job.sourceFilesAvailable ? "Re-run now" : "Source files expired"}
                >
                  Re-run
                </button>
                <button type="button" className="btn-ghost" onClick={() => void reuseSettings(job)}>
                  Reuse Settings
                </button>
                <button type="button" className="btn-ghost" onClick={() => void removeHistory(job)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="fixed bottom-4 right-4 z-30 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`rounded-xl border px-3 py-2 text-sm shadow-lg ${
              toast.kind === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : toast.kind === "error"
                  ? "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-forge-300 bg-forge-50 text-forge-800"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </main>
  );
}
