import type { ToolType } from "@/lib/types/api";

const LABELS: Record<ToolType, string> = {
  "word.docx_to_pdf": "Word -> PDF",
  "convert.html_pdf": "HTML -> PDF",
  "convert.markdown_docx": "Markdown -> DOCX",
  "pdf.merge": "Merge PDFs",
  "pdf.compress": "Compress PDFs",
  "pdf.split": "Split PDF",
  "pdf.rotate": "Rotate PDFs",
  "pdf.page_numbers": "Add Page Numbers",
  "pdf.to_images": "PDF -> Images",
  "image.process": "Process Images",
  "convert.images_pdf": "Images -> PDF"
};

export function getToolLabel(tool: ToolType): string {
  return LABELS[tool];
}

export function getTabForTool(tool: ToolType): "Convert" | "PDF" | "Images" {
  if (tool.startsWith("pdf.")) {
    return "PDF";
  }
  if (tool.startsWith("image.") || tool === "convert.images_pdf") {
    return "Images";
  }
  return "Convert";
}
