import type { JobOptions } from "@/lib/types/api";

export type FilenameDateParseResult = {
  dateMs: number | null;
  matched: boolean;
  strategy: "custom" | "payslip" | "text_month" | "iso" | "compact" | "none";
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type TimeParts = {
  hour: number;
  minute: number;
  second: number;
};

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12
};

function toInt(value: string): number {
  return Number.parseInt(value, 10);
}

function normalizeMonthToken(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "sept") {
    return "sep";
  }
  return normalized.slice(0, 3);
}

function isValidDateParts(parts: DateParts): boolean {
  if (parts.year < 2000 || parts.year > 2099) return false;
  if (parts.month < 1 || parts.month > 12) return false;
  if (parts.day < 1 || parts.day > 31) return false;
  return true;
}

function isValidTimeParts(parts: TimeParts): boolean {
  if (parts.hour < 0 || parts.hour > 23) return false;
  if (parts.minute < 0 || parts.minute > 59) return false;
  if (parts.second < 0 || parts.second > 59) return false;
  return true;
}

function toEpochMs(dateParts: DateParts, timeParts: TimeParts): number | null {
  if (!isValidDateParts(dateParts) || !isValidTimeParts(timeParts)) {
    return null;
  }

  const value = new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    timeParts.second,
    0
  ).getTime();

  return Number.isFinite(value) ? value : null;
}

function parseDateByFormat(raw: string, format: NonNullable<JobOptions["filenameDateDateFormat"]>): DateParts | null {
  if (format === "DD-MMM-YY") {
    const match = raw.match(/^(\d{2})-([A-Za-z]{3,4})-(\d{2})$/);
    if (!match) return null;
    const month = MONTH_MAP[normalizeMonthToken(match[2])];
    if (!month) return null;
    return {
      day: toInt(match[1]),
      month,
      year: 2000 + toInt(match[3])
    };
  }

  if (format === "DDMMYY") {
    if (!/^\d{6}$/.test(raw)) return null;
    return {
      day: toInt(raw.slice(0, 2)),
      month: toInt(raw.slice(2, 4)),
      year: 2000 + toInt(raw.slice(4, 6))
    };
  }

  if (format === "YYYYMMDD") {
    if (!/^\d{8}$/.test(raw)) return null;
    return {
      year: toInt(raw.slice(0, 4)),
      month: toInt(raw.slice(4, 6)),
      day: toInt(raw.slice(6, 8))
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return {
    year: toInt(raw.slice(0, 4)),
    month: toInt(raw.slice(5, 7)),
    day: toInt(raw.slice(8, 10))
  };
}

function parseTimeByFormat(raw: string | undefined, format: NonNullable<JobOptions["filenameDateTimeFormat"]>): TimeParts | null {
  if (format === "none") {
    return { hour: 0, minute: 0, second: 0 };
  }

  if (!raw) {
    return { hour: 0, minute: 0, second: 0 };
  }

  if (format === "HHMMSS") {
    if (!/^\d{6}$/.test(raw)) return null;
    return {
      hour: toInt(raw.slice(0, 2)),
      minute: toInt(raw.slice(2, 4)),
      second: toInt(raw.slice(4, 6))
    };
  }

  if (!/^\d{2}:\d{2}:\d{2}$/.test(raw)) return null;
  return {
    hour: toInt(raw.slice(0, 2)),
    minute: toInt(raw.slice(3, 5)),
    second: toInt(raw.slice(6, 8))
  };
}

function parseByFormat(
  dateRaw: string,
  timeRaw: string | undefined,
  dateFormat: NonNullable<JobOptions["filenameDateDateFormat"]>,
  timeFormat: NonNullable<JobOptions["filenameDateTimeFormat"]>
): number | null {
  const dateParts = parseDateByFormat(dateRaw, dateFormat);
  if (!dateParts) return null;
  const timeParts = parseTimeByFormat(timeRaw, timeFormat);
  if (!timeParts) return null;
  return toEpochMs(dateParts, timeParts);
}

function parseSmart(filename: string): FilenameDateParseResult {
  const payslip = filename.match(/^[^-]+-(\d{6})-(\d{6})-/);
  if (payslip) {
    const ms = parseByFormat(payslip[1], payslip[2], "DDMMYY", "HHMMSS");
    if (ms !== null) {
      return { dateMs: ms, matched: true, strategy: "payslip" };
    }
  }

  const textMonth = filename.match(/(\d{2}-[A-Za-z]{3,4}-\d{2})(?:[T _-](\d{2}:\d{2}:\d{2}|\d{6}))?/);
  if (textMonth) {
    const timeRaw = textMonth[2];
    const format: NonNullable<JobOptions["filenameDateTimeFormat"]> =
      timeRaw ? (timeRaw.includes(":") ? "HH:mm:ss" : "HHMMSS") : "none";
    const ms = parseByFormat(textMonth[1], timeRaw, "DD-MMM-YY", format);
    if (ms !== null) {
      return { dateMs: ms, matched: true, strategy: "text_month" };
    }
  }

  const iso = filename.match(/(\d{4}-\d{2}-\d{2})(?:[T _-]?(\d{2}:\d{2}:\d{2}|\d{6}))?/);
  if (iso) {
    const timeRaw = iso[2];
    const format: NonNullable<JobOptions["filenameDateTimeFormat"]> =
      timeRaw && timeRaw.includes(":") ? "HH:mm:ss" : "HHMMSS";
    const ms = parseByFormat(iso[1], timeRaw, "YYYY-MM-DD", format);
    if (ms !== null) {
      return { dateMs: ms, matched: true, strategy: "iso" };
    }
  }

  const compact = filename.match(/(\d{8})(?:[T _-]?(\d{6}))?/);
  if (compact) {
    const ms = parseByFormat(compact[1], compact[2], "YYYYMMDD", "HHMMSS");
    if (ms !== null) {
      return { dateMs: ms, matched: true, strategy: "compact" };
    }
  }

  return { dateMs: null, matched: false, strategy: "none" };
}

function parseCustom(filename: string, options: JobOptions): FilenameDateParseResult {
  const source = options.filenameDateRegex?.trim();
  if (!source) {
    return { dateMs: null, matched: false, strategy: "none" };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(source, options.filenameDateIgnoreCase ? "i" : undefined);
  } catch {
    return { dateMs: null, matched: false, strategy: "none" };
  }

  const match = regex.exec(filename);
  const groups = match?.groups;
  const dateRaw = groups?.date;
  if (!dateRaw) {
    return { dateMs: null, matched: false, strategy: "none" };
  }

  const dateFormat = options.filenameDateDateFormat ?? "DDMMYY";
  const timeFormat = options.filenameDateTimeFormat ?? "HHMMSS";
  const ms = parseByFormat(dateRaw, groups?.time, dateFormat, timeFormat);
  if (ms === null) {
    return { dateMs: null, matched: false, strategy: "none" };
  }

  return { dateMs: ms, matched: true, strategy: "custom" };
}

export function parseFilenameDate(filename: string, options?: JobOptions): FilenameDateParseResult {
  if (options?.filenameDateMode === "custom") {
    return parseCustom(filename, options);
  }
  return parseSmart(filename);
}

export function countFilenameDateMatches(fileNames: string[], options?: JobOptions): { matched: number; total: number } {
  let matched = 0;
  for (const name of fileNames) {
    if (parseFilenameDate(name, options).matched) {
      matched += 1;
    }
  }
  return { matched, total: fileNames.length };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatFileDate(ms: number, format = "YYYY-MM-DD"): string {
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return format
    .replace("YYYY", String(date.getFullYear()))
    .replace("MM", pad2(date.getMonth() + 1))
    .replace("DD", pad2(date.getDate()));
}
