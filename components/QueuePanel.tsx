import type { QueueMiniStatProps } from "@/components/uiTypes";

type QueuePanelProps = {
  title?: string;
  stats: QueueMiniStatProps[];
  activeJobLabel?: string;
  activeJobProgress?: number;
  showPolicy: boolean;
  onTogglePolicy: () => void;
};

export function QueuePanel({
  title = "Queue Status",
  stats,
  activeJobLabel,
  activeJobProgress,
  showPolicy,
  onTogglePolicy
}: QueuePanelProps) {
  return (
    <aside className="section-card" aria-label="Queue panel">
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Queue limits and policy"
          onClick={onTogglePolicy}
          aria-expanded={showPolicy}
        >
          i
        </button>
      </div>

      <div className="queue-stats" role="list">
        {stats.map((stat) => (
          <div key={stat.label} className="queue-stat" role="listitem">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      {activeJobLabel && (
        <div className="queue-active" aria-live="polite">
          <p className="queue-active-label">Current</p>
          <p>{activeJobLabel}</p>
          <p>Progress: {activeJobProgress ?? 0}%</p>
        </div>
      )}

      {showPolicy && (
        <p className="queue-policy">
          Limits: 30 files/job, 50MB/file, 200MB total, 2 concurrent jobs. Word conversion runs single-file mutex.
        </p>
      )}
    </aside>
  );
}
