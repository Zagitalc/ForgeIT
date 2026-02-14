import path from "node:path";
import fs from "node:fs/promises";

import sharp from "sharp";

type Options = {
  width?: number;
  height?: number;
  format?: "jpeg" | "png" | "webp";
  quality?: number;
};

export async function processImages(
  inputPaths: string[],
  outputDir: string,
  options: Options
): Promise<string[]> {
  const outputs: string[] = [];
  await fs.mkdir(outputDir, { recursive: true });

  for (const inputPath of inputPaths) {
    const base = path.parse(inputPath).name;
    const format = options.format ?? "jpeg";
    const outputPath = path.join(outputDir, `${base}.${format}`);

    let pipeline = sharp(inputPath);
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, { fit: "inside", withoutEnlargement: true });
    }

    if (format === "jpeg") {
      pipeline = pipeline.jpeg({ quality: options.quality ?? 80 });
    } else if (format === "png") {
      pipeline = pipeline.png({ quality: options.quality ?? 80 });
    } else {
      pipeline = pipeline.webp({ quality: options.quality ?? 80 });
    }

    await pipeline.toFile(outputPath);
    outputs.push(outputPath);
  }

  return outputs;
}
