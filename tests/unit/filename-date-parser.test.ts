import { describe, expect, it } from "vitest";

import { countFilenameDateMatches, formatFileDate, parseFilenameDate } from "@/lib/sort/filenameDate";
import type { JobOptions } from "@/lib/types/api";

describe("parseFilenameDate", () => {
  it("parses payslip DDMMYY-HHMMSS pattern", () => {
    const result = parseFilenameDate("dec_H80707-020725-094930-0000657546-1.pdf");
    expect(result.matched).toBe(true);
    expect(result.strategy).toBe("payslip");
    expect(formatFileDate(result.dateMs ?? 0, "YYYY-MM-DD")).toBe("2025-07-02");
  });

  it("parses ISO-like filename dates", () => {
    const result = parseFilenameDate("report-2025-12-03_08:30:01-final.pdf");
    expect(result.matched).toBe(true);
    expect(result.strategy).toBe("iso");
    expect(formatFileDate(result.dateMs ?? 0, "YYYY-MM-DD")).toBe("2025-12-03");
  });

  it("parses statement DD-MMM-YY dates in smart mode", () => {
    const result = parseFilenameDate("Statement 01-DEC-25 AC 30967726 02051017.pdf");
    expect(result.matched).toBe(true);
    expect(result.strategy).toBe("text_month");
    expect(formatFileDate(result.dateMs ?? 0, "YYYY-MM-DD")).toBe("2025-12-01");
  });

  it("parses mixed-case month names including SEPT", () => {
    const mixed = parseFilenameDate("Statement 08-SepT-21 AC 30967726.pdf");
    expect(mixed.matched).toBe(true);
    expect(formatFileDate(mixed.dateMs ?? 0, "YYYY-MM-DD")).toBe("2021-09-08");
  });

  it("treats unknown month tokens as unparseable", () => {
    const result = parseFilenameDate("Statement 01-XYZ-25 AC 30967726.pdf");
    expect(result.matched).toBe(false);
    expect(result.strategy).toBe("none");
  });

  it("supports custom regex with named date/time groups", () => {
    const options: JobOptions = {
      outputSortBy: "filename_date",
      filenameDateMode: "custom",
      filenameDateRegex: "^doc_(?<date>\\d{8})_(?<time>\\d{6})",
      filenameDateDateFormat: "YYYYMMDD",
      filenameDateTimeFormat: "HHMMSS"
    };
    const result = parseFilenameDate("doc_20260115_235959_ref.pdf", options);
    expect(result.matched).toBe(true);
    expect(result.strategy).toBe("custom");
    expect(formatFileDate(result.dateMs ?? 0, "YYYY-MM-DD")).toBe("2026-01-15");
  });

  it("supports custom DD-MMM-YY date with no time", () => {
    const options: JobOptions = {
      outputSortBy: "filename_date",
      filenameDateMode: "custom",
      filenameDateRegex: "Statement\\s+(?<date>\\d{2}-[A-Za-z]{3}-\\d{2})",
      filenameDateDateFormat: "DD-MMM-YY",
      filenameDateTimeFormat: "none"
    };
    const result = parseFilenameDate("Statement 02-FEB-26 AC 30967726.pdf", options);
    expect(result.matched).toBe(true);
    expect(result.strategy).toBe("custom");
    expect(formatFileDate(result.dateMs ?? 0, "YYYY-MM-DD")).toBe("2026-02-02");
  });

  it("treats invalid custom regex configuration as unparseable", () => {
    const options: JobOptions = {
      outputSortBy: "filename_date",
      filenameDateMode: "custom",
      filenameDateRegex: "^(?<prefix>[^-]+)-(?<time>\\d{6})$",
      filenameDateDateFormat: "DDMMYY",
      filenameDateTimeFormat: "HHMMSS"
    };
    const result = parseFilenameDate("dec_H80707-020725-094930-1.pdf", options);
    expect(result.matched).toBe(false);
    expect(result.strategy).toBe("none");
  });
});

describe("countFilenameDateMatches", () => {
  it("counts matched filenames in mixed batches", () => {
    const mixed = [
      "dec_H80707-020725-094930-0000657546-1.pdf",
      "notes.pdf",
      "doc_20260115_235959_ref.pdf"
    ];
    const options: JobOptions = {
      outputSortBy: "filename_date",
      filenameDateMode: "custom",
      filenameDateRegex: "^doc_(?<date>\\d{8})_(?<time>\\d{6})",
      filenameDateDateFormat: "YYYYMMDD",
      filenameDateTimeFormat: "HHMMSS"
    };
    const result = countFilenameDateMatches(mixed, options);
    expect(result).toEqual({ matched: 1, total: 3 });
  });
});
