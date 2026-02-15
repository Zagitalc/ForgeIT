import { StatusBadge } from "@/components/StatusBadge";
import { HistoryCard } from "@/components/HistoryCard";
import type { JobRecord } from "@/lib/types/api";

type HistoryPanelProps = {
  jobs: JobRecord[];
  historySort: "date" | "type";
  onSortChange: (value: "date" | "type") => void;
  onRefresh: () => void;
  relativeTime: (iso: string) => string;
  canDownload: (job: JobRecord) => boolean;
  outputLabel: (job: JobRecord) => string;
  onDownload: (job: JobRecord) => void;
  onRerun: (job: JobRecord) => void;
  onReuseSettings: (job: JobRecord) => void;
  onDelete: (job: JobRecord) => void;
};

function parseSummary(job: JobRecord): string | undefined {
  if (typeof job.sortParseTotal !== "number" || job.sortParseTotal <= 0) {
    return undefined;
  }

  return `Filename date parsed: ${job.sortParseMatched ?? 0}/${job.sortParseTotal}`;
}

export function HistoryPanel({
  jobs,
  historySort,
  onSortChange,
  onRefresh,
  relativeTime,
  canDownload,
  outputLabel,
  onDownload,
  onRerun,
  onReuseSettings,
  onDelete
}: HistoryPanelProps) {
  return (
    <section className="section-card" aria-label="History panel">
      <div className="section-head">
        <h2 className="section-title">History</h2>
        <div className="history-controls">
          <select
            className="select-input"
            value={historySort}
            onChange={(event) => onSortChange(event.target.value as "date" | "type")}
            aria-label="Sort history"
          >
            <option value="date">Sort: Date</option>
            <option value="type">Sort: Type</option>
          </select>
          <button type="button" className="action-btn" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="history-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Tool</th>
              <th>Status</th>
              <th>Started</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td className="font-mono text-xs">{job.id}</td>
                <td>
                  <div>{job.displayTool}</div>
                  {parseSummary(job) && <div className="history-meta">{parseSummary(job)}</div>}
                </td>
                <td>
                  <StatusBadge status={job.status} />
                </td>
                <td className="text-xs" title={new Date(job.startedAt).toLocaleString()}>
                  {relativeTime(job.startedAt)}
                </td>
                <td>
                  <div className="history-actions-row">
                    {canDownload(job) && (
                      <button type="button" className="action-btn action-btn-secondary" onClick={() => onDownload(job)}>
                        {outputLabel(job)}
                      </button>
                    )}
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => onRerun(job)}
                      disabled={!job.sourceFilesAvailable}
                      title={job.sourceFilesAvailable ? "Re-run now" : "Source files expired"}
                    >
                      Re-run
                    </button>
                    <button type="button" className="action-btn" onClick={() => onReuseSettings(job)}>
                      Reuse Settings
                    </button>
                    <button type="button" className="action-btn action-btn-danger" onClick={() => onDelete(job)}>
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
        {jobs.map((job) => (
          <HistoryCard
            key={job.id}
            job={job}
            relativeStarted={relativeTime(job.startedAt)}
            parseSummary={parseSummary(job)}
            canDownload={canDownload(job)}
            downloadLabel={outputLabel(job)}
            onDownload={onDownload}
            onRerun={onRerun}
            onReuseSettings={onReuseSettings}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
