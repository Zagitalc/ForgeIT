const QPDF_CANDIDATES = [
  process.env.QPDF_PATH,
  "/usr/bin/qpdf",
  "/opt/homebrew/bin/qpdf",
  "qpdf",
  "C:\\Program Files\\qpdf\\bin\\qpdf.exe"
].filter(Boolean) as string[];

export function getQpdfCandidates(): string[] {
  return QPDF_CANDIDATES;
}

