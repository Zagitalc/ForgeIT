"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";

import { AppShell } from "@/components/AppShell";
import { BottomNav } from "@/components/BottomNav";
import { ConverterPanel } from "@/components/ConverterPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { QueuePanel } from "@/components/QueuePanel";
import { ToastStack } from "@/components/ToastStack";
import { TopBar } from "@/components/TopBar";
import type { AppSection, QueueMiniStatProps, ToastMessage, ToolOption, ToolTab } from "@/components/uiTypes";
import { getTabForTool, getToolLabel } from "@/lib/jobs/display";
import { countFilenameDateMatches, formatFileDate, parseFilenameDate } from "@/lib/sort/filenameDate";
import type { JobOptions, JobRecord, ToolType } from "@/lib/types/api";

const TABS = ["Convert", "PDF", "Images"] as const satisfies readonly ToolTab[];

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

const TOOL_OPTIONS: ToolOption[] = [
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

const TOKENS = ["{original}", "{tool}", "{index}", "{date:YYYY-MM-DD}", "{filedate:YYYY-MM-DD}"];

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

export function truncateMiddle(value: string, maxLength = 44): string {
  if (value.length <= maxLength) return value;
  const side = Math.floor((maxLength - 3) / 2);
  return `${value.slice(0, side)}...${value.slice(value.length - side)}`;
}

export function renderPatternPreview(pattern: string, params: { original: string; tool: ToolType; fileDateMs?: number }): string {
  const template = pattern.trim() || "{original}-{tool}-{index}";
  const today = new Date();
  const now = template.replace(/\{date:([^}]+)\}/g, (_full, fmt: string) => {
    return fmt
      .replace("YYYY", String(today.getFullYear()))
      .replace("MM", String(today.getMonth() + 1).padStart(2, "0"))
      .replace("DD", String(today.getDate()).padStart(2, "0"));
  });
  const withFileDate = now.replace(/\{filedate:([^}]+)\}/g, (_full, fmt: string) => {
    return formatFileDate(params.fileDateMs ?? Date.now(), fmt);
  });
  return withFileDate
    .replaceAll("{original}", params.original)
    .replaceAll("{tool}", params.tool)
    .replaceAll("{index}", "1")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function joinUniqueFiles(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map((file) => fileIdentity(file)));
  const next = [...existing];
  for (const file of incoming) {
    const key = fileIdentity(file);
    if (!seen.has(key)) {
      seen.add(key);
      next.push(file);
    }
  }
  return next;
}

function fileIdentity(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export function Dashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appSection, setAppSection] = useState<AppSection>("converter");
  const [tab, setTab] = useState<ToolTab>("Convert");
  const [tool, setTool] = useState<ToolType>("word.docx_to_pdf");
  const [files, setFiles] = useState<File[]>([]);
  const [splitPages, setSplitPages] = useState("1-2");
  const [rotateDegrees, setRotateDegrees] = useState<90 | 180 | 270>(90);
  const [imageFormat, setImageFormat] = useState<"jpeg" | "png" | "webp">("jpeg");
  const [imageQuality, setImageQuality] = useState(80);
  const [namingPattern, setNamingPattern] = useState("{original}-{tool}-{index}");
  const [outputSortBy, setOutputSortBy] = useState<"name" | "date" | "filename_date">("name");
  const [outputSortDirection, setOutputSortDirection] = useState<"asc" | "desc">("asc");
  const [filenameDateMode, setFilenameDateMode] = useState<"smart" | "custom">("smart");
  const [filenameDateRegex, setFilenameDateRegex] = useState("^[^-]+-(?<date>\\d{6})-(?<time>\\d{6})-");
  const [filenameDateDateFormat, setFilenameDateDateFormat] = useState<"DDMMYY" | "YYYYMMDD" | "YYYY-MM-DD" | "DD-MMM-YY">("DDMMYY");
  const [filenameDateTimeFormat, setFilenameDateTimeFormat] = useState<"none" | "HHMMSS" | "HH:mm:ss">("HHMMSS");
  const [filenameDateIgnoreCase, setFilenameDateIgnoreCase] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [health, setHealth] = useState<HealthResponse["data"] | null>(null);
  const [historySort, setHistorySort] = useState<"date" | "type">("date");
  const [dragOver, setDragOver] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showQueuePolicy, setShowQueuePolicy] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const filteredTools = useMemo(() => TOOL_OPTIONS.filter((option) => option.tab === tab), [tab]);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      if (historySort === "type") {
        return (a.displayTool ?? getToolLabel(a.tool)).localeCompare(b.displayTool ?? getToolLabel(b.tool));
      }
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }, [historySort, jobs]);

  const activeJob = useMemo(() => jobs.find((job) => job.status === "processing" || job.status === "queued"), [jobs]);

  const filesForDisplay = useMemo(() => {
    const parseOptions: JobOptions = {
      outputSortBy: "filename_date",
      filenameDateMode,
      filenameDateRegex,
      filenameDateDateFormat,
      filenameDateTimeFormat,
      filenameDateIgnoreCase
    };

    return files
      .map((file) => ({
        key: fileIdentity(file),
        file,
        parsed: parseFilenameDate(file.name, parseOptions)
      }))
      .sort((left, right) => {
        if (outputSortBy === "filename_date") {
          if (left.parsed.matched !== right.parsed.matched) {
            return left.parsed.matched ? -1 : 1;
          }
          if (left.parsed.matched && right.parsed.matched) {
            const order = outputSortDirection === "asc" ? 1 : -1;
            const diff = ((left.parsed.dateMs ?? 0) - (right.parsed.dateMs ?? 0)) * order;
            if (diff !== 0) {
              return diff;
            }
          }
        } else if (outputSortBy === "date") {
          const order = outputSortDirection === "asc" ? 1 : -1;
          const diff = (left.file.lastModified - right.file.lastModified) * order;
          if (diff !== 0) {
            return diff;
          }
        }

        const order = outputSortDirection === "asc" ? 1 : -1;
        const nameDiff = left.file.name.localeCompare(right.file.name, undefined, { sensitivity: "base" }) * order;
        if (nameDiff !== 0) {
          return nameDiff;
        }

        return left.key.localeCompare(right.key);
      });
  }, [
    files,
    filenameDateDateFormat,
    filenameDateIgnoreCase,
    filenameDateMode,
    filenameDateRegex,
    filenameDateTimeFormat,
    outputSortBy,
    outputSortDirection
  ]);

  const filenameDateParsePreview = useMemo(() => {
    if (outputSortBy !== "filename_date") {
      return null;
    }

    const parseOptions: JobOptions = {
      outputSortBy: "filename_date",
      filenameDateMode,
      filenameDateRegex,
      filenameDateDateFormat,
      filenameDateTimeFormat,
      filenameDateIgnoreCase
    };

    const counts = countFilenameDateMatches(
      files.map((file) => file.name),
      parseOptions
    );

    return counts;
  }, [files, filenameDateDateFormat, filenameDateIgnoreCase, filenameDateMode, filenameDateRegex, filenameDateTimeFormat, outputSortBy]);

  const filenameDateValidationError = useMemo(() => {
    if (outputSortBy !== "filename_date" || filenameDateMode !== "custom") {
      return "";
    }

    const source = filenameDateRegex.trim();
    if (!source) {
      return "Custom mode requires a regex pattern.";
    }
    if (!source.includes("(?<date>")) {
      return "Regex must include named group `date` (and optional `time`).";
    }

    try {
      // eslint-disable-next-line no-new
      new RegExp(source, filenameDateIgnoreCase ? "i" : undefined);
    } catch {
      return "Regex is invalid.";
    }

    return "";
  }, [filenameDateIgnoreCase, filenameDateMode, filenameDateRegex, outputSortBy]);

  const selectedTool = TOOL_OPTIONS.find((option) => option.value === tool);

  const canSubmit =
    files.length > 0 &&
    !loading &&
    !(tool === "word.docx_to_pdf" && !health?.libreOffice.available) &&
    !filenameDateValidationError;

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

  function pushToast(kind: ToastMessage["kind"], toastMessage: string): void {
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
    const options: JobOptions = {
      namingPattern,
      outputSortBy,
      outputSortDirection,
      splitPages,
      rotateDegrees,
      imageFormat,
      imageQuality
    };

    if (outputSortBy === "filename_date") {
      options.filenameDateMode = filenameDateMode;
      if (filenameDateMode === "custom") {
        options.filenameDateRegex = filenameDateRegex.trim();
        options.filenameDateDateFormat = filenameDateDateFormat;
        options.filenameDateTimeFormat = filenameDateTimeFormat;
        options.filenameDateIgnoreCase = filenameDateIgnoreCase;
      }
    }

    return options;
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

  function onDragOver(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setDragOver(true);
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

    setAppSection("converter");
    setTab(getTabForTool(nextTool) as ToolTab);
    setTool(nextTool);
    setNamingPattern(options.namingPattern ?? "{original}-{tool}-{index}");
    setOutputSortBy(options.outputSortBy ?? "name");
    setOutputSortDirection(options.outputSortDirection ?? "asc");
    setFilenameDateMode(options.filenameDateMode ?? "smart");
    setFilenameDateRegex(options.filenameDateRegex ?? "^[^-]+-(?<date>\\d{6})-(?<time>\\d{6})-");
    setFilenameDateDateFormat(options.filenameDateDateFormat ?? "DDMMYY");
    setFilenameDateTimeFormat((options.filenameDateTimeFormat as "none" | "HHMMSS" | "HH:mm:ss") ?? "HHMMSS");
    setFilenameDateIgnoreCase(Boolean(options.filenameDateIgnoreCase));
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

  function removeFileByKey(key: string): void {
    setFiles((prev) => prev.filter((file) => fileIdentity(file) !== key));
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

  const sampleBase = files[0]?.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") ?? "sample-output";
  const sampleParsedDate = filesForDisplay.find((entry) => entry.parsed.matched)?.parsed.dateMs ?? undefined;
  const previewName = renderPatternPreview(namingPattern, {
    original: sampleBase,
    tool,
    fileDateMs: sampleParsedDate ?? Date.now()
  });

  const queueStats: QueueMiniStatProps[] = [
    { label: "Active", value: health?.queue.active ?? 0 },
    { label: "Queued", value: health?.queue.queued ?? 0 }
  ];

  return (
    <AppShell
      topBar={
        <TopBar
          title="ForgeIT"
          subtitle="LOCAL-FIRST"
          libreOfficeAvailable={Boolean(health?.libreOffice.available)}
          showInfo={showInfo}
          onToggleInfo={() => setShowInfo((prev) => !prev)}
        />
      }
      bottomNav={<BottomNav active={appSection} onChange={setAppSection} />}
    >
      <section className="grid gap-4 md:grid-cols-[1fr,320px]">
        <div className={`${appSection === "converter" ? "block" : "hidden"} md:block`} data-testid="app-section-converter">
          <ConverterPanel
            tabs={TABS}
            tab={tab}
            onTabChange={setTab}
            tool={tool}
            filteredTools={filteredTools}
            onToolChange={setTool}
            fileInputRef={fileInputRef}
            accepts={selectedTool?.accepts}
            filesCount={files.length}
            dragOver={dragOver}
            onDragOver={onDragOver}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            appendFiles={appendFiles}
            clearFiles={() => setFiles([])}
            filesForDisplay={filesForDisplay}
            removeFileByKey={removeFileByKey}
            formatBytes={formatBytes}
            truncateMiddle={truncateMiddle}
            toolNeedsSplitPages={tool === "pdf.split"}
            splitPages={splitPages}
            setSplitPages={setSplitPages}
            toolNeedsRotate={tool === "pdf.rotate"}
            rotateDegrees={rotateDegrees}
            setRotateDegrees={setRotateDegrees}
            toolNeedsImageOptions={tool === "image.process"}
            imageFormat={imageFormat}
            setImageFormat={setImageFormat}
            imageQuality={imageQuality}
            setImageQuality={setImageQuality}
            namingPattern={namingPattern}
            setNamingPattern={setNamingPattern}
            outputSortBy={outputSortBy}
            setOutputSortBy={setOutputSortBy}
            outputSortDirection={outputSortDirection}
            setOutputSortDirection={setOutputSortDirection}
            filenameDateMode={filenameDateMode}
            setFilenameDateMode={setFilenameDateMode}
            filenameDateRegex={filenameDateRegex}
            setFilenameDateRegex={setFilenameDateRegex}
            filenameDateDateFormat={filenameDateDateFormat}
            setFilenameDateDateFormat={setFilenameDateDateFormat}
            filenameDateTimeFormat={filenameDateTimeFormat}
            setFilenameDateTimeFormat={setFilenameDateTimeFormat}
            filenameDateIgnoreCase={filenameDateIgnoreCase}
            setFilenameDateIgnoreCase={setFilenameDateIgnoreCase}
            filenameDateParsePreview={filenameDateParsePreview}
            filenameDateValidationError={filenameDateValidationError}
            tokens={TOKENS}
            insertToken={insertToken}
            previewName={previewName}
            canSubmit={canSubmit}
            loading={loading}
            message={message}
            onSubmit={handleSubmit}
          />
        </div>

        <div className={`${appSection === "queue" ? "block" : "hidden"} md:block`} data-testid="app-section-queue">
          <QueuePanel
            stats={queueStats}
            activeJobLabel={activeJob?.displayTool ?? (activeJob ? getToolLabel(activeJob.tool) : undefined)}
            activeJobProgress={activeJob?.progress ?? (activeJob?.status === "completed" ? 100 : 0)}
            showPolicy={showQueuePolicy}
            onTogglePolicy={() => setShowQueuePolicy((prev) => !prev)}
          />
        </div>
      </section>

      <div className={`${appSection === "history" ? "block" : "hidden"} md:block`} data-testid="app-section-history">
        <HistoryPanel
          jobs={sortedJobs}
          historySort={historySort}
          onSortChange={setHistorySort}
          onRefresh={() => void fetchJobs()}
          relativeTime={relativeTime}
          canDownload={canDownload}
          outputLabel={outputLabel}
          onDownload={(job) => void download(job)}
          onRerun={(job) => void rerun(job)}
          onReuseSettings={(job) => void reuseSettings(job)}
          onDelete={(job) => void removeHistory(job)}
        />
      </div>

      <section className={`${appSection === "settings" ? "block" : "hidden"} settings-card md:hidden`} data-testid="app-section-settings">
        <h2 className="section-title">Settings</h2>
        <p className="preview-note">Theme and runtime controls live in the top bar. Conversion behavior remains local-first.</p>
      </section>

      <ToastStack toasts={toasts} />
    </AppShell>
  );
}
