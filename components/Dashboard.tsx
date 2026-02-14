"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { JobRecord, ToolType } from "@/lib/types/api";

const TABS = ["Convert", "PDF", "Images", "Output", "History"] as const;

type Tab = (typeof TABS)[number];

type HealthResponse = {
  ok: boolean;
  data: {
    libreOffice: { available: boolean; path: string | null };
    queue: { active: number; queued: number };
  };
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

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("Convert");
  const [tool, setTool] = useState<ToolType>("word.docx_to_pdf");
  const [files, setFiles] = useState<FileList | null>(null);
  const [splitPages, setSplitPages] = useState("1-2");
  const [rotateDegrees, setRotateDegrees] = useState<90 | 180 | 270>(90);
  const [imageFormat, setImageFormat] = useState<"jpeg" | "png" | "webp">("jpeg");
  const [imageQuality, setImageQuality] = useState(80);
  const [namingPattern, setNamingPattern] = useState("{original}-{tool}-{index}");
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [health, setHealth] = useState<HealthResponse["data"] | null>(null);
  const [historySort, setHistorySort] = useState<"date" | "type">("date");

  const filteredTools = useMemo(() => TOOL_OPTIONS.filter((option) => option.tab === tab), [tab]);
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      if (historySort === "type") {
        return a.tool.localeCompare(b.tool);
      }
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }, [historySort, jobs]);

  useEffect(() => {
    const firstTool = filteredTools[0];
    if (firstTool) {
      setTool(firstTool.value);
    }
  }, [tab, filteredTools]);

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

  async function fetchHealth(): Promise<void> {
    const response = await fetch("/api/health");
    const payload = (await response.json()) as HealthResponse;
    if (payload.ok) {
      setHealth(payload.data);
    }
  }

  async function fetchJobs(): Promise<void> {
    const response = await fetch("/api/jobs");
    const payload = await response.json();
    if (payload.ok) {
      setJobs(payload.data.jobs as JobRecord[]);
    }
  }

  async function fetchJob(id: string): Promise<void> {
    const response = await fetch(`/api/jobs/${id}`);
    const payload = await response.json();
    if (payload.ok) {
      const data = payload.data as JobRecord;
      if (data.status === "completed") {
        setMessage(`Job ${id} completed. Download is ready.`);
      }
      if (data.status === "failed") {
        setMessage(data.errorMessage ?? "Job failed.");
      }
    }
  }

  function buildOptions(): Record<string, unknown> {
    return {
      namingPattern,
      splitPages,
      rotateDegrees,
      imageFormat,
      imageQuality
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!files || files.length === 0) {
      setMessage("Select at least one file.");
      return;
    }

    setLoading(true);
    setMessage("Submitting job...");

    const formData = new FormData();
    formData.set("tool", tool);
    formData.set("options", JSON.stringify(buildOptions()));

    Array.from(files).forEach((file) => formData.append("files", file));

    const response = await fetch("/api/jobs", {
      method: "POST",
      body: formData
    });

    const payload = await response.json();
    setLoading(false);

    if (!payload.ok) {
      setMessage(payload.error?.message ?? "Job submission failed.");
      return;
    }

    setJobId(payload.jobId);
    setMessage(`Job ${payload.jobId} queued.`);
    await fetchJobs();
  }

  async function download(job: JobRecord): Promise<void> {
    const href = `/api/jobs/${job.id}/download`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const selectedTool = TOOL_OPTIONS.find((option) => option.value === tool);
  const showToolForm = filteredTools.length > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="panel flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">ForgeIT</h1>
          <p className="text-sm text-[var(--muted)]">
            Local-first converter. New conversions require the ForgeIT server and local dependencies running.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {health && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${health.libreOffice.available ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
              LibreOffice {health.libreOffice.available ? "Ready" : "Missing"}
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1fr,320px]">
        <div className="panel">
          <nav className="mb-4 flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${tab === item ? "bg-forge-500 text-white shadow-glow" : "bg-forge-100 text-forge-700 hover:bg-forge-200 dark:bg-forge-900 dark:text-forge-200"}`}
              >
                {item}
              </button>
            ))}
          </nav>

          {showToolForm ? (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium">Tool</label>
              <select className="input" value={tool} onChange={(event) => setTool(event.target.value as ToolType)}>
                {filteredTools.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

            <label className="block text-sm font-medium">Files</label>
            <input
              className="input"
              type="file"
              multiple
              accept={selectedTool?.accepts}
              onChange={(event) => setFiles(event.target.files)}
            />

            {tool === "pdf.split" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Page range (e.g. 1,3-5)</label>
                <input className="input" value={splitPages} onChange={(event) => setSplitPages(event.target.value)} />
              </div>
            )}

            {tool === "pdf.rotate" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Rotate Degrees</label>
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
                  <label className="mb-1 block text-sm font-medium">Format</label>
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
                  <label className="mb-1 block text-sm font-medium">Quality</label>
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
              <label className="mb-1 block text-sm font-medium">Naming Pattern</label>
              <input
                className="input"
                value={namingPattern}
                onChange={(event) => setNamingPattern(event.target.value)}
                placeholder="{original}-{tool}-{index}"
              />
            </div>

              <div className="flex items-center gap-2">
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Start Job"}
                </button>
                <p className="text-sm text-[var(--muted)]">{message}</p>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-forge-200 p-4 text-sm text-[var(--muted)] dark:border-forge-800">
              Output and history tools are managed from the right panel and job table below.
            </div>
          )}
        </div>

        <aside className="panel space-y-3">
          <h2 className="font-display text-lg font-semibold">Queue</h2>
          <p className="text-sm text-[var(--muted)]">
            Active: {health?.queue.active ?? 0} | Queued: {health?.queue.queued ?? 0}
          </p>
          <p className="text-xs text-[var(--muted)]">
            Limits: 20 files/job, 50MB/file, 200MB total, 2 concurrent jobs. Word conversion runs single-file mutex.
          </p>
          <div className="rounded-xl border border-forge-300/60 p-3 text-sm dark:border-forge-700">
            <p className="font-medium">PWA offline scope</p>
            <p className="text-[var(--muted)]">
              UI shell can load from cache. New conversion jobs still require local server runtime and dependencies.
            </p>
          </div>
        </aside>
      </section>

      <section className="panel overflow-hidden">
        <div className="mb-3 flex items-center justify-between">
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

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-forge-200 dark:border-forge-800">
                <th className="py-2">Job</th>
                <th className="py-2">Tool</th>
                <th className="py-2">Status</th>
                <th className="py-2">Started</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job) => (
                <tr key={job.id} className="border-b border-forge-100 align-middle dark:border-forge-900">
                  <td className="py-2 font-mono text-xs">{job.id}</td>
                  <td className="py-2">{job.tool}</td>
                  <td className="py-2">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="py-2 text-xs">{new Date(job.startedAt).toLocaleString()}</td>
                  <td className="py-2">
                    {job.status === "completed" ? (
                      <button type="button" className="btn-ghost" onClick={() => void download(job)}>
                        Download ZIP
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
