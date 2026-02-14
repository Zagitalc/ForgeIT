import path from "node:path";

export function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function ensureSafeJoin(base: string, segment: string): string {
  const target = path.resolve(base, segment);
  const normalizedBase = path.resolve(base) + path.sep;

  if (!target.startsWith(normalizedBase)) {
    throw new Error("Unsafe path traversal attempt blocked.");
  }

  return target;
}
