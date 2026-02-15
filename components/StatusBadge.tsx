import clsx from "clsx";

type Props = {
  status: "queued" | "processing" | "completed" | "failed";
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={clsx(
        "status-pill",
        status === "completed" && "status-pill-success",
        status === "queued" && "status-pill-warning",
        status === "processing" && "status-pill-info",
        status === "failed" && "status-pill-danger"
      )}
      aria-label={`Job status ${status}`}
    >
      {status}
    </span>
  );
}
