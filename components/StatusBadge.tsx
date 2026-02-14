import clsx from "clsx";

type Props = {
  status: "queued" | "processing" | "completed" | "failed";
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={clsx(
        "rounded-full border px-2.5 py-1 text-xs font-semibold",
        status === "completed" && "border-emerald-300 bg-emerald-100 text-emerald-800",
        status === "queued" && "border-amber-300 bg-amber-100 text-amber-800",
        status === "processing" && "border-sky-300 bg-sky-100 text-sky-800",
        status === "failed" && "border-rose-300 bg-rose-100 text-rose-800"
      )}
    >
      {status}
    </span>
  );
}
