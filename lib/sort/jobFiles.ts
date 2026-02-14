import { parseFilenameDate } from "@/lib/sort/filenameDate";
import type { JobOptions } from "@/lib/types/api";
import type { JobFile } from "@/lib/types/jobs";

function compareText(left: string, right: string, direction: "asc" | "desc"): number {
  const order = direction === "asc" ? 1 : -1;
  return left.localeCompare(right, undefined, { sensitivity: "base" }) * order;
}

export function sortJobFiles(files: JobFile[], options?: JobOptions): JobFile[] {
  const sortBy = options?.outputSortBy ?? "name";
  const direction = options?.outputSortDirection ?? "asc";

  return [...files].sort((left, right) => {
    if (sortBy === "filename_date") {
      const l = parseFilenameDate(left.originalName, options);
      const r = parseFilenameDate(right.originalName, options);

      if (l.matched !== r.matched) {
        return l.matched ? -1 : 1;
      }

      if (l.matched && r.matched) {
        const order = direction === "asc" ? 1 : -1;
        const diff = ((l.dateMs ?? 0) - (r.dateMs ?? 0)) * order;
        if (diff !== 0) {
          return diff;
        }
      }
    } else if (sortBy === "date") {
      const order = direction === "asc" ? 1 : -1;
      const diff = (left.lastModifiedMs - right.lastModifiedMs) * order;
      if (diff !== 0) {
        return diff;
      }
    }

    const nameDiff = compareText(left.originalName, right.originalName, direction);
    if (nameDiff !== 0) {
      return nameDiff;
    }

    // keep deterministic even when names and dates are equal
    return left.storedPath.localeCompare(right.storedPath);
  });
}
