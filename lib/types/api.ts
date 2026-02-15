export const TOOL_TYPES = [
  "word.docx_to_pdf",
  "convert.html_pdf",
  "convert.markdown_docx",
  "pdf.merge",
  "pdf.split",
  "pdf.rotate",
  "pdf.page_numbers",
  "pdf.to_images",
  "image.process",
  "convert.images_pdf"
] as const;

export type ToolType = (typeof TOOL_TYPES)[number];

export type ErrorCode =
  | "LIBREOFFICE_NOT_FOUND"
  | "LIBREOFFICE_TIMEOUT"
  | "LIBREOFFICE_CONVERSION_FAILED"
  | "QUEUE_FULL"
  | "UNSUPPORTED_FORMAT"
  | "LIMIT_EXCEEDED"
  | "VALIDATION_ERROR"
  | "PROCESSING_FAILED"
  | "JOB_NOT_FOUND";

export type ApiError = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: string;
  };
};

export type ApiSuccess<T> = {
  ok: true;
  jobId: string;
  data: T;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type JobRecord = {
  id: string;
  tool: ToolType;
  displayTool?: string;
  displayName?: string;
  status: JobStatus;
  progress?: number;
  inputCount: number;
  outputCount: number;
  totalBytes: number;
  startedAt: string;
  completedAt: string | null;
  errorCode: ErrorCode | null;
  errorMessage: string | null;
  outputPath: string | null;
  primaryOutputExt?: string;
  canDirectDownload?: boolean;
  options?: JobOptions;
  sourceFileNames?: string[];
  sourceFileModifieds?: Record<string, number>;
  sourceFilesAvailable?: boolean;
  sortParseMatched?: number;
  sortParseTotal?: number;
  expiresAt: string | null;
};

export type JobOptions = {
  namingPattern?: string;
  outputSortBy?: "name" | "date" | "filename_date";
  outputSortDirection?: "asc" | "desc";
  filenameDateMode?: "smart" | "custom";
  filenameDateRegex?: string;
  filenameDateDateFormat?: "DDMMYY" | "YYYYMMDD" | "YYYY-MM-DD" | "DD-MMM-YY";
  filenameDateTimeFormat?: "HHMMSS" | "HH:mm:ss" | "none";
  filenameDateIgnoreCase?: boolean;
  splitPages?: string;
  rotateDegrees?: 90 | 180 | 270;
  imageFormat?: "jpeg" | "png" | "webp";
  imageQuality?: number;
  imageWidth?: number;
  imageHeight?: number;
  pageNumberStart?: number;
};
