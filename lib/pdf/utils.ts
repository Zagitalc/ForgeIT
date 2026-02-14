export function parsePageRanges(input: string, maxPages: number): number[] {
  const pages = new Set<number>();

  for (const part of input.split(",").map((x) => x.trim())) {
    if (!part) {
      continue;
    }

    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        throw new Error(`Invalid page range: ${part}`);
      }
      for (let page = start; page <= end; page += 1) {
        if (page >= 1 && page <= maxPages) {
          pages.add(page - 1);
        }
      }
      continue;
    }

    const value = Number(part);
    if (!Number.isInteger(value)) {
      throw new Error(`Invalid page number: ${part}`);
    }
    if (value >= 1 && value <= maxPages) {
      pages.add(value - 1);
    }
  }

  return [...pages].sort((a, b) => a - b);
}
