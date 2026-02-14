import path from "node:path";

import type { ToolType } from "@/lib/types/api";

const DATE_PATTERN = /\{date:([^}]+)\}/g;
const FILE_DATE_PATTERN = /\{filedate:([^}]+)\}/g;

function formatDate(template: string, date = new Date()): string {
  return template
    .replace("YYYY", String(date.getFullYear()))
    .replace("MM", String(date.getMonth() + 1).padStart(2, "0"))
    .replace("DD", String(date.getDate()).padStart(2, "0"));
}

export function buildOutputFileName(params: {
  pattern?: string;
  originalName: string;
  index: number;
  tool: ToolType;
  outputExt: string;
  fileDateMs?: number;
  sourceModifiedMs?: number;
}): string {
  const { pattern, originalName, index, tool, outputExt, fileDateMs, sourceModifiedMs } = params;
  const base = path.parse(originalName).name;

  const template = pattern?.trim() || "{original}-{tool}-{index}";
  const withDate = template.replace(DATE_PATTERN, (_, datePattern: string) => formatDate(datePattern));
  const dateValue = fileDateMs ?? sourceModifiedMs ?? Date.now();
  const withFileDate = withDate.replace(FILE_DATE_PATTERN, (_, datePattern: string) =>
    formatDate(datePattern, new Date(dateValue))
  );

  const rendered = withFileDate
    .replaceAll("{original}", base)
    .replaceAll("{index}", String(index + 1))
    .replaceAll("{tool}", tool)
    .replaceAll("{ext}", outputExt);

  const trimmed = rendered.replace(/[^a-zA-Z0-9._-]/g, "_");
  return trimmed.endsWith(`.${outputExt}`) ? trimmed : `${trimmed}.${outputExt}`;
}
