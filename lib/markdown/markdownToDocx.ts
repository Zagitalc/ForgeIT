import fs from "node:fs/promises";

import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import MarkdownIt from "markdown-it";

export async function convertMarkdownToDocx(markdown: string, outputPath: string): Promise<void> {
  const md = new MarkdownIt();
  const tokens = md.parse(markdown, {});
  const paragraphs: Paragraph[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "inline") {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: token.content })]
        })
      );
    }

    if (token.type === "heading_open") {
      const inline = tokens[index + 1];
      const level = Number(token.tag.replace("h", ""));
      paragraphs.push(
        new Paragraph({
          text: inline?.content ?? "",
          heading:
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3
        })
      );
    }

    if (token.type === "bullet_list_open") {
      let cursor = index + 1;
      while (tokens[cursor] && tokens[cursor].type !== "bullet_list_close") {
        if (tokens[cursor].type === "inline") {
          paragraphs.push(
            new Paragraph({
              text: tokens[cursor].content,
              bullet: { level: 0 }
            })
          );
        }
        cursor += 1;
      }
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({
    sections: [
      {
        children: paragraphs
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
}
