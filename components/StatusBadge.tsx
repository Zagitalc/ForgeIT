import clsx from "clsx";

type Props = {
  status: "queued" | "processing" | "completed" | "failed";
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        status === "completed" && "bg-emerald-100 text-emerald-700",
        status === "queued" && "bg-amber-100 text-amber-700",
        status === "processing" && "bg-blue-100 text-blue-700",
        status === "failed" && "bg-rose-100 text-rose-700"
      )}
    >
      {status}
    </span>
  );
}
