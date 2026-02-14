import os from "node:os";

const DEFAULT_PATHS: Record<NodeJS.Platform, string[]> = {
  darwin: [
    process.env.LIBREOFFICE_PATH ?? "",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "soffice"
  ],
  linux: [process.env.LIBREOFFICE_PATH ?? "", "soffice"],
  win32: [
    process.env.LIBREOFFICE_PATH ?? "",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
  ],
  aix: [process.env.LIBREOFFICE_PATH ?? "", "soffice"],
  freebsd: [process.env.LIBREOFFICE_PATH ?? "", "soffice"],
  openbsd: [process.env.LIBREOFFICE_PATH ?? "", "soffice"],
  sunos: [process.env.LIBREOFFICE_PATH ?? "", "soffice"],
  android: [process.env.LIBREOFFICE_PATH ?? "", "soffice"],
  cygwin: [process.env.LIBREOFFICE_PATH ?? "", "soffice"],
  netbsd: [process.env.LIBREOFFICE_PATH ?? "", "soffice"],
  haiku: [process.env.LIBREOFFICE_PATH ?? "", "soffice"]
};

export function getLibreOfficeCandidates(): string[] {
  const platform = os.platform();
  const entries = DEFAULT_PATHS[platform] ?? ["soffice"];
  return entries.filter(Boolean);
}
