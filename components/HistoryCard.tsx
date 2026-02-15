import { StatusBadge } from "@/components/StatusBadge";
import type { HistoryCardProps } from "@/components/uiTypes";

export function HistoryCard({
  job,
  relativeStarted,
  parseSummary,
  canDownload,
  downloadLabel,
  onDownload,
  onRerun,
  onReuseSettings,
  onDelete
}: HistoryCardProps) {
  return (
    <article className="history-card" data-testid={`history-card-${job.id}`}>
      <div className="history-card-head">
        <p className="history-card-id">#{job.id}</p>
        <StatusBadge status={job.status} />
      </div>
      <p className="history-card-title">{job.displayTool}</p>
      {parseSummary && <p className="history-card-meta">{parseSummary}</p>}
      <p className="history-card-meta">{relativeStarted}</p>

      <div className="history-card-actions">
        {canDownload && (
          <button type="button" className="action-btn action-btn-secondary" onClick={() => onDownload(job)}>
            {downloadLabel}
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
    </article>
  );
}
