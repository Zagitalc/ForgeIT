import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { buildOutputFileName } from "@/lib/jobs/naming";
import type { JobOptions, ToolType } from "@/lib/types/api";

type ZipEntry = {
  outputPath: string;
  outputExt: string;
  originalName: string;
  sourceModifiedMs: number;
  sortName: string;
};

function compareEntries(
  left: ZipEntry,
  right: ZipEntry,
  sortBy: "name" | "date",
  direction: "asc" | "desc"
): number {
  const order = direction === "asc" ? 1 : -1;

  if (sortBy === "date") {
    const diff = (left.sourceModifiedMs - right.sourceModifiedMs) * order;
    if (diff !== 0) {
      return diff;
    }
  }

  const nameDiff = left.sortName.localeCompare(right.sortName, undefined, { sensitivity: "base" }) * order;
  if (nameDiff !== 0) {
    return nameDiff;
  }

  return left.outputPath.localeCompare(right.outputPath) * order;
}

function buildEntries(params: {
  inputNames: string[];
  outputPaths: string[];
  sourceModifieds?: number[];
  namingPattern?: string;
  tool: ToolType;
}): ZipEntry[] {
  return params.outputPaths.map((outputPath, index) => {
    const outputExt = path.extname(outputPath).replace(".", "") || "bin";
    const originalName = params.inputNames[index] ?? params.inputNames[0] ?? path.basename(outputPath);
    const sourceModifiedMs = params.sourceModifieds?.[index] ?? params.sourceModifieds?.[0] ?? 0;
    const sortName = buildOutputFileName({
      pattern: params.namingPattern,
      originalName,
      // placeholder index; real index is assigned after sorting
      index: 0,
      tool: params.tool,
      outputExt
    });

    return {
      outputPath,
      outputExt,
      originalName,
      sourceModifiedMs,
      sortName
    };
  });
}

export async function createOutputZip(params: {
  inputNames: string[];
  outputPaths: string[];
  sourceModifieds?: number[];
  options?: JobOptions;
  namingPattern?: string;
  tool: ToolType;
  destinationPath: string;
}): Promise<string> {
  const zip = new JSZip();
  const dateFolder = new Date().toISOString().slice(0, 10);
  const sortBy = params.options?.outputSortBy ?? "name";
  const sortDirection = params.options?.outputSortDirection ?? "asc";

  const entries = buildEntries({
    inputNames: params.inputNames,
    outputPaths: params.outputPaths,
    sourceModifieds: params.sourceModifieds,
    namingPattern: params.namingPattern,
    tool: params.tool
  }).sort((left, right) => compareEntries(left, right, sortBy, sortDirection));

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const bytes = await fs.readFile(entry.outputPath);
    const name = buildOutputFileName({
      pattern: params.namingPattern,
      originalName: entry.originalName,
      index,
      tool: params.tool,
      outputExt: entry.outputExt
    });

    const typeFolder = entry.outputExt;
    zip.folder(dateFolder)?.folder(typeFolder)?.file(name, bytes);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(params.destinationPath, buffer);
  return params.destinationPath;
}

export function sortZipEntriesForTest(params: {
  inputNames: string[];
  outputPaths: string[];
  sourceModifieds?: number[];
  options?: JobOptions;
  namingPattern?: string;
  tool: ToolType;
}): string[] {
  const sortBy = params.options?.outputSortBy ?? "name";
  const sortDirection = params.options?.outputSortDirection ?? "asc";

  const entries = buildEntries(params).sort((left, right) => compareEntries(left, right, sortBy, sortDirection));
  return entries.map((entry) => entry.outputPath);
}
