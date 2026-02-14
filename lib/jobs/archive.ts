import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { buildOutputFileName } from "@/lib/jobs/naming";
import type { ToolType } from "@/lib/types/api";

export async function createOutputZip(params: {
  inputNames: string[];
  outputPaths: string[];
  namingPattern?: string;
  tool: ToolType;
  destinationPath: string;
}): Promise<string> {
  const zip = new JSZip();
  const dateFolder = new Date().toISOString().slice(0, 10);

  for (let index = 0; index < params.outputPaths.length; index += 1) {
    const outputPath = params.outputPaths[index];
    const bytes = await fs.readFile(outputPath);
    const ext = path.extname(outputPath).replace(".", "") || "bin";
    const originalName = params.inputNames[index] ?? path.basename(outputPath);
    const name = buildOutputFileName({
      pattern: params.namingPattern,
      originalName,
      index,
      tool: params.tool,
      outputExt: ext
    });

    const typeFolder = ext;
    zip.folder(dateFolder)?.folder(typeFolder)?.file(name, bytes);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await fs.writeFile(params.destinationPath, buffer);
  return params.destinationPath;
}
