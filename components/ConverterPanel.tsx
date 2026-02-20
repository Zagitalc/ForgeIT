import type { RefObject } from "react";
import type { DragEvent, FormEvent } from "react";

import type { ConverterFileEntry, ToolOption, ToolTab } from "@/components/uiTypes";
import { formatFileDate } from "@/lib/sort/filenameDate";
import type { ToolType } from "@/lib/types/api";

type FilenameDatePreview = {
  matched: number;
  total: number;
};

type ConverterPanelProps = {
  tabs: readonly ToolTab[];
  tab: ToolTab;
  onTabChange: (value: ToolTab) => void;
  tool: ToolType;
  filteredTools: ToolOption[];
  onToolChange: (value: ToolType) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  accepts?: string;
  filesCount: number;
  dragOver: boolean;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  appendFiles: (files: File[]) => void;
  clearFiles: () => void;
  filesForDisplay: ConverterFileEntry[];
  removeFileByKey: (key: string) => void;
  formatBytes: (bytes: number) => string;
  truncateMiddle: (value: string, maxLength?: number) => string;
  toolNeedsSplitPages: boolean;
  splitPages: string;
  setSplitPages: (value: string) => void;
  toolNeedsPdfCompress: boolean;
  pdfCompressMode: "safe";
  setPdfCompressMode: (value: "safe") => void;
  qpdfAvailable: boolean;
  toolNeedsRotate: boolean;
  rotateDegrees: 90 | 180 | 270;
  setRotateDegrees: (value: 90 | 180 | 270) => void;
  toolNeedsImageOptions: boolean;
  imageFormat: "jpeg" | "png" | "webp";
  setImageFormat: (value: "jpeg" | "png" | "webp") => void;
  imageQuality: number;
  setImageQuality: (value: number) => void;
  namingPattern: string;
  setNamingPattern: (value: string) => void;
  outputSortBy: "name" | "date" | "filename_date";
  setOutputSortBy: (value: "name" | "date" | "filename_date") => void;
  outputSortDirection: "asc" | "desc";
  setOutputSortDirection: (value: "asc" | "desc") => void;
  filenameDateMode: "smart" | "custom";
  setFilenameDateMode: (value: "smart" | "custom") => void;
  filenameDateRegex: string;
  setFilenameDateRegex: (value: string) => void;
  filenameDateDateFormat: "DDMMYY" | "YYYYMMDD" | "YYYY-MM-DD" | "DD-MMM-YY";
  setFilenameDateDateFormat: (value: "DDMMYY" | "YYYYMMDD" | "YYYY-MM-DD" | "DD-MMM-YY") => void;
  filenameDateTimeFormat: "none" | "HHMMSS" | "HH:mm:ss";
  setFilenameDateTimeFormat: (value: "none" | "HHMMSS" | "HH:mm:ss") => void;
  filenameDateIgnoreCase: boolean;
  setFilenameDateIgnoreCase: (value: boolean) => void;
  filenameDateParsePreview: FilenameDatePreview | null;
  filenameDateValidationError: string;
  tokens: string[];
  insertToken: (token: string) => void;
  previewName: string;
  canSubmit: boolean;
  loading: boolean;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function ConverterPanel({
  tabs,
  tab,
  onTabChange,
  tool,
  filteredTools,
  onToolChange,
  fileInputRef,
  accepts,
  filesCount,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  appendFiles,
  clearFiles,
  filesForDisplay,
  removeFileByKey,
  formatBytes,
  truncateMiddle,
  toolNeedsSplitPages,
  splitPages,
  setSplitPages,
  toolNeedsPdfCompress,
  pdfCompressMode,
  setPdfCompressMode,
  qpdfAvailable,
  toolNeedsRotate,
  rotateDegrees,
  setRotateDegrees,
  toolNeedsImageOptions,
  imageFormat,
  setImageFormat,
  imageQuality,
  setImageQuality,
  namingPattern,
  setNamingPattern,
  outputSortBy,
  setOutputSortBy,
  outputSortDirection,
  setOutputSortDirection,
  filenameDateMode,
  setFilenameDateMode,
  filenameDateRegex,
  setFilenameDateRegex,
  filenameDateDateFormat,
  setFilenameDateDateFormat,
  filenameDateTimeFormat,
  setFilenameDateTimeFormat,
  filenameDateIgnoreCase,
  setFilenameDateIgnoreCase,
  filenameDateParsePreview,
  filenameDateValidationError,
  tokens,
  insertToken,
  previewName,
  canSubmit,
  loading,
  message,
  onSubmit
}: ConverterPanelProps) {
  return (
    <section className="section-card" aria-label="Converter panel">
      <nav className="tool-tabs" aria-label="Tool categories">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onTabChange(item)}
            className={`tool-tab ${tab === item ? "tool-tab-active" : ""}`}
          >
            {item}
          </button>
        ))}
      </nav>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="field-label">Tool Selector</label>
          <select
            className="select-input"
            value={tool}
            onChange={(event) => onToolChange(event.target.value as ToolType)}
            aria-label="Select conversion tool"
          >
            {filteredTools.map((option: ToolOption) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="field-label">Files</label>
            {filesCount > 0 && (
              <button type="button" className="action-btn" onClick={clearFiles}>
                Clear All
              </button>
            )}
          </div>
          <button
            type="button"
            data-testid="dropzone-trigger"
            className={`dropzone ${dragOver ? "dropzone-active" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Drop files here or click to browse"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept={accepts}
              onChange={(event) => appendFiles([...(event.target.files ?? [])])}
            />
            <p className="dropzone-title">Drop files here or click to browse</p>
            <p className="dropzone-meta">
              {filesCount} selected • max 50 files • max 150MB each • large batches may process slower
            </p>
          </button>
        </div>

        {filesCount > 0 && (
          <ul className="file-list" aria-label="Selected files">
            {filesForDisplay.map((entry) => (
              <li key={entry.key} className="file-item">
                <div className="min-w-0">
                  <span className="block truncate" title={entry.file.name}>
                    {truncateMiddle(entry.file.name)} ({formatBytes(entry.file.size)})
                  </span>
                  {outputSortBy === "filename_date" && entry.parsed.matched && entry.parsed.dateMs !== null && (
                    <span className="file-date-pill">{formatFileDate(entry.parsed.dateMs, "YYYY-MM-DD")}</span>
                  )}
                </div>
                <button type="button" className="action-btn" onClick={() => removeFileByKey(entry.key)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {toolNeedsSplitPages && (
          <div>
            <label className="field-label">Page range (e.g. 1,3-5)</label>
            <input className="text-input" value={splitPages} onChange={(event) => setSplitPages(event.target.value)} />
          </div>
        )}

        {toolNeedsPdfCompress && (
          <div>
            <label className="field-label">Compression Mode</label>
            <select
              className="select-input"
              value={pdfCompressMode}
              onChange={(event) => setPdfCompressMode(event.target.value as "safe")}
            >
              <option value="safe">Safe (lossless)</option>
            </select>
            <p className="preview-note">Optimizes PDF structure and streams without intentional quality loss.</p>
            {!qpdfAvailable && (
              <p className="text-xs text-red-500">qpdf not detected. Install qpdf to use PDF compression.</p>
            )}
          </div>
        )}

        {toolNeedsRotate && (
          <div>
            <label className="field-label">Rotate Degrees</label>
            <select
              className="select-input"
              value={rotateDegrees}
              onChange={(event) => setRotateDegrees(Number(event.target.value) as 90 | 180 | 270)}
            >
              <option value={90}>90</option>
              <option value={180}>180</option>
              <option value={270}>270</option>
            </select>
          </div>
        )}

        {toolNeedsImageOptions && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="field-label">Format</label>
              <select
                className="select-input"
                value={imageFormat}
                onChange={(event) => setImageFormat(event.target.value as "jpeg" | "png" | "webp")}
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
            <div>
              <label className="field-label">Quality</label>
              <input
                className="text-input"
                type="number"
                min={1}
                max={100}
                value={imageQuality}
                onChange={(event) => setImageQuality(Number(event.target.value))}
              />
            </div>
          </div>
        )}

        <div className="section-subcard">
          <label className="field-label">Naming Pattern</label>
          <input
            className="text-input"
            value={namingPattern}
            onChange={(event) => setNamingPattern(event.target.value)}
            placeholder="{original}-{tool}-{index}"
          />

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="field-label-sm">Sort Outputs By</label>
              <select
                className="select-input"
                value={outputSortBy}
                onChange={(event) => setOutputSortBy(event.target.value as "name" | "date" | "filename_date")}
                aria-label="Sort outputs by"
              >
                <option value="name">Original Name</option>
                <option value="date">Upload Date</option>
                <option value="filename_date">Date in Filename (Smart)</option>
              </select>
            </div>
            <div>
              <label className="field-label-sm">Direction</label>
              <select
                className="select-input"
                value={outputSortDirection}
                onChange={(event) => setOutputSortDirection(event.target.value as "asc" | "desc")}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {outputSortBy === "filename_date" && (
            <div className="filename-date-config">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="field-label-sm">Mode</label>
                  <select
                    className="select-input"
                    value={filenameDateMode}
                    onChange={(event) => setFilenameDateMode(event.target.value as "smart" | "custom")}
                  >
                    <option value="smart">Smart</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {filenameDateParsePreview && (
                  <p className="filename-date-summary">
                    Detected {filenameDateParsePreview.matched}/{filenameDateParsePreview.total} filename dates.
                  </p>
                )}
              </div>

              {filenameDateMode === "custom" && (
                <>
                  <div>
                    <label className="field-label-sm">Regex (named groups: date, optional time)</label>
                    <input
                      className="text-input"
                      value={filenameDateRegex}
                      onChange={(event) => setFilenameDateRegex(event.target.value)}
                      placeholder="^(?<prefix>[^-]+)-(?<date>\\d{6})-(?<time>\\d{6})-"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="field-label-sm">Date Format</label>
                      <select
                        className="select-input"
                        value={filenameDateDateFormat}
                        onChange={(event) =>
                          setFilenameDateDateFormat(
                            event.target.value as "DDMMYY" | "YYYYMMDD" | "YYYY-MM-DD" | "DD-MMM-YY"
                          )
                        }
                      >
                        <option value="DDMMYY">DDMMYY</option>
                        <option value="DD-MMM-YY">DD-MMM-YY</option>
                        <option value="YYYYMMDD">YYYYMMDD</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label-sm">Time Format</label>
                      <select
                        className="select-input"
                        value={filenameDateTimeFormat}
                        onChange={(event) =>
                          setFilenameDateTimeFormat(event.target.value as "none" | "HHMMSS" | "HH:mm:ss")
                        }
                      >
                        <option value="none">none</option>
                        <option value="HHMMSS">HHMMSS</option>
                        <option value="HH:mm:ss">HH:mm:ss</option>
                      </select>
                    </div>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={filenameDateIgnoreCase}
                      onChange={(event) => setFilenameDateIgnoreCase(event.target.checked)}
                    />
                    Ignore case
                  </label>
                </>
              )}

              {filenameDateValidationError && <p className="error-text">{filenameDateValidationError}</p>}
            </div>
          )}

          <div className="chip-row">
            {tokens.map((token) => (
              <button key={token} type="button" className="chip" onClick={() => insertToken(token)}>
                + {token}
              </button>
            ))}
          </div>

          <p className="preview-text">
            Preview: <code className="inline-code">{previewName}</code>
          </p>
          <p className="preview-note">Sort order controls output package file order and index token numbering.</p>
        </div>

        <div className="space-y-2">
          <button className="primary-cta" type="submit" disabled={!canSubmit} data-testid="start-job-btn">
            {loading ? "Submitting..." : "Start Job"}
          </button>
          <p className="status-message" aria-live="polite">
            {message}
          </p>
        </div>
      </form>
    </section>
  );
}
